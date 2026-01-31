const BackgroundTask = require('./BackgroundTask');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { getModels } = require('../database');

class ImportTmdbTask extends BackgroundTask {
  // downloader: Optional stream function for testing/mocking.
  // If provided, it will be used instead of the real downloadJsonGzStream method.
  // This allows tests to provide mock data without hitting the real API.
  constructor(downloader = null) {
    super();
    this.downloader = downloader;
  }

  static get label() {
    return 'Import TMDB Database';
  }

  async runTask(args, context) {
    let gzFilePath = null;
    let jsonFilePath = null;
    
    const today = new Date();
    const dateFileSpec = `${String(today.getMonth()+1).padStart(2,'0')}_${String(today.getDate()).padStart(2,'0')}_${today.getFullYear()}`;

    try {
      // Step 1: Download data (indeterminate progress)
      context.reportProgress({ description: 'Downloading data...' });
      gzFilePath = await this.downloadJsonGz(context.abortSignal, dateFileSpec);

      // Step 1: Decompress data (indeterminate progress)
      context.reportProgress({ description: 'Decompressing data...' });
      jsonFilePath = await this.decompressJson(context.abortSignal, dateFileSpec);
      
      // Step 3: Process records
      context.reportProgress({ description: 'Processing records...' });
      const stats = fs.statSync(jsonFilePath);
      const totalBytes = stats.size;
      
      await this.processFile(jsonFilePath, totalBytes, context);
      
      // Step 4: Complete
      context.reportProgress({ description: 'Complete' });
    } catch (error) {
      if (error.name === 'AbortError' || context.isCancelled()) {
        throw new Error('Task cancelled');
      }
      console.error('ImportTmdbTask error:', error);
      throw error;
    } finally {
      // Clean up temp files
      if (gzFilePath && fs.existsSync(gzFilePath)) {
        fs.unlinkSync(gzFilePath);
      }
      if (jsonFilePath && fs.existsSync(jsonFilePath)) {
        fs.unlinkSync(jsonFilePath);
      }
    }
  }

  _getDownloadJsonGzStream() {
    return this.downloader || this.downloadJsonGzStream.bind(this);
  }

  async downloadJsonGzStream(abortSignal, dateFileSpec) {
    return new Promise((resolve, reject) => {
      const url = `https://files.tmdb.org/p/exports/movie_ids_${dateFileSpec}.json.gz`;
      
      const req = https.get(url, { signal: abortSignal }, (res) => {
        resolve(res);
      });
      
      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  async downloadJsonGz(abortSignal, dateFileSpec) {
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `tmdb_import_${dateFileSpec}.json.gz`);
      
      this._getDownloadJsonGzStream()(abortSignal, dateFileSpec)
        .then((stream) => {
          const file = fs.createWriteStream(tempFilePath);
          
          stream.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve(tempFilePath);
          });
          
          stream.on('error', (err) => {
            fs.unlink(tempFilePath, () => {});
            reject(err);
          });
          
          file.on('error', (err) => {
            fs.unlink(tempFilePath, () => {});
            reject(err);
          });
        })
        .catch((err) => {
          fs.unlink(tempFilePath, () => {});
          reject(err);
        });
    });
  }

  async decompressJson(abortSignal, dateFileSpec) {
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const inputPath = path.join(tempDir, `tmdb_import_${dateFileSpec}.json.gz`);
      const outputPath = path.join(tempDir, `tmdb_import_${dateFileSpec}.json`);

      const inFile = fs.createReadStream(inputPath);
      const gunzip = zlib.createGunzip();
      const outFile = fs.createWriteStream(outputPath);
  
      inFile.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete the file on error
        reject(err);
      });
      gunzip.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete the file on error
        reject(err);
      });
      outFile.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete the file on error
        reject(err);
      });
  
      // resolve when the output stream finishes
      outFile.on('finish', () => {
        outFile.close();
        resolve(outputPath);
      });

      // Handle abort
      const onAbort = () => {
        // destroy all streams
        inFile.destroy();
        gunzip.destroy();
        outFile.destroy();
        reject(new Error('Decompression aborted'));
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          return onAbort(); // already aborted
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }
  
      // pipe the streams
      inFile.pipe(gunzip).pipe(outFile);
    });
  }

  async processFile(filePath, totalBytes, context) {
    const models = getModels();
    const fileStream = fs.createReadStream(filePath);

    let bytesRead = 0;
    let buffer = '';
    let linesProcessed = 0;
    let processingPromise = Promise.resolve();
    let lastProgressTime = Date.now();

    const processLine = async (rawLine) => {
      const normalizedLine = rawLine.replace(/[\u2028\u2029]/g, '');

      // Parse data line
      const record = JSON.parse(normalizedLine);

      if (record) {
        const tmdbId = String(record['id']);
        const title = record['original_title'];
        const popularity = record['popularity'];
        const has_video = record['video'];

        models.movies.upsertFromTmdb(
          tmdbId,
          title,
          popularity,
          has_video
        );

        linesProcessed++;
      }
    };

    return new Promise((resolve, reject) => {

      fileStream.on('data', chunk => {
        processingPromise = processingPromise.then(async () => {
          buffer += chunk;
          let index;
          while ((index = buffer.indexOf('\n')) !== -1) {
            if (context.isCancelled()) {
              throw new Error('Task cancelled');
            }

            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            bytesRead += Buffer.byteLength(line, 'utf8') + 1; // +1 for newline
            await processLine(line);

            // Yield control to event loop every 0.1 seconds to prevent UI freezing
            let currentTime = Date.now();
            if (currentTime - lastProgressTime >= 100) {
              await new Promise(resolve => setTimeout(resolve, 0));

              context.reportProgress({
                current: bytesRead,
                max: totalBytes,
                description: `Processing records... ${linesProcessed} titles processed`
              });
              
              lastProgressTime = currentTime;
            }
          }
        }).catch(reject);
      });

      fileStream.on('end', () => {
        processingPromise = processingPromise.then(async () => {
          // Handle any remaining buffer if no final newline
          if (buffer.length > 0) {
            await processLine(buffer);
          }

          // Final progress report
          context.reportProgress({
            current: totalBytes, // all bytes read, even if our estimates were off during processing
            max: totalBytes,
            description: `Processing records... ${linesProcessed} titles processed`
          });
        }).then(resolve).catch(reject);
      });

      fileStream.on('error', reject);
    });
  }
}

module.exports = ImportTmdbTask;

const BackgroundTask = require('./BackgroundTask');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { parse } = require('csv-parse/sync');
const { getModels } = require('../database');

class ImportWatchmodeTask extends BackgroundTask {
  // downloader: Optional stream function for testing/mocking.
  // If provided, it will be used instead of the real downloadCsvStream method.
  // This allows tests to provide mock data without hitting the real API.
  constructor(downloader = null) {
    super();
    this.downloader = downloader;
  }

  static get label() {
    return 'Import Watchmode Database';
  }

  async runTask(args, context) {
    let tempFilePath = null;
    
    try {
      // Step 1: Download data (indeterminate progress)
      context.reportProgress({ description: 'Downloading data...' });
      tempFilePath = await this.downloadCsv(context.abortSignal);
      
      // Step 2: Process records
      context.reportProgress({ description: 'Processing records...' });
      const stats = fs.statSync(tempFilePath);
      const totalBytes = stats.size;
      
      await this.processFile(tempFilePath, totalBytes, context);
      
      // Step 3: Complete
      context.reportProgress({ description: 'Complete' });
    } catch (error) {
      if (error.name === 'AbortError' || context.isCancelled()) {
        throw new Error('Task cancelled');
      }
      console.error('ImportWatchmodeTask error:', error);
      throw error;
    } finally {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  _getDownloadCsvStream() {
    return this.downloader || this.downloadCsvStream.bind(this);
  }

  async downloadCsvStream(abortSignal) {
    return new Promise((resolve, reject) => {
      const url = 'https://api.watchmode.com/datasets/title_id_map.csv';
      
      const req = https.get(url, { signal: abortSignal }, (res) => {
        resolve(res);
      });
      
      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  async downloadCsv(abortSignal) {
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `watchmode_import_${Date.now()}.csv`);
      
      this._getDownloadCsvStream()(abortSignal)
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

  async processFile(filePath, totalBytes, context) {
    const models = getModels();
    const fileStream = fs.createReadStream(filePath);

    let bytesRead = 0;
    let buffer = '';
    let headers = null;
    let linesProcessed = 0;
    let processingPromise = Promise.resolve();
    let lastProgressTime = Date.now();

    const processLine = async (rawLine) => {
      const normalizedLine = rawLine.replace(/[\u2028\u2029]/g, '');

      if (headers === null) {
        // Parse header
        const headerRecords = parse(normalizedLine + '\n', { trim: true });
        headers = headerRecords[0].map(h => h.toLowerCase());
      } else {
        // Parse data line
        const records = parse(normalizedLine + '\n', { columns: headers, trim: true });
        const record = records[0];

        if (record) {
          const watchmodeId = record['watchmode id'];
          const tmdbType = record['tmdb type'];
          const tmdbId = record['tmdb id'];
          const title = record['title'];
          const year = record['year'];

          if (tmdbType && tmdbType.toLowerCase() === 'movie') {
            models.movies.upsertFromWatchmode(
              watchmodeId,
              tmdbId,
              title,
              year
            );
          }

          linesProcessed++;
        }
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
            bytesRead += Buffer.byteLength(buffer, 'utf8');
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

module.exports = ImportWatchmodeTask;

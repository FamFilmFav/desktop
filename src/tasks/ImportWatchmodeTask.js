const BackgroundTask = require('./BackgroundTask');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { parse } = require('csv-parse/sync');
const { getModels } = require('../database');

class ImportWatchmodeTask extends BackgroundTask {
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

  async downloadCsv(abortSignal) {
    return new Promise((resolve, reject) => {
      const url = 'https://api.watchmode.com/datasets/title_id_map.csv';
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `watchmode_import_${Date.now()}.csv`);
      
      const file = fs.createWriteStream(tempFilePath);
      
      const req = https.get(url, { signal: abortSignal }, (res) => {
        res.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(tempFilePath);
        });
      });
      
      req.on('error', (err) => {
        fs.unlink(tempFilePath, () => {}); // Delete the file on error
        reject(err);
      });
      
      file.on('error', (err) => {
        fs.unlink(tempFilePath, () => {}); // Delete the file on error
        reject(err);
      });
    });
  }

  async processFile(filePath, totalBytes, context) {
    const models = getModels();
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let bytesRead = 0;
    let headers = null;
    let linesProcessed = 0;

    for await (const line of rl) {
      if (context.isCancelled()) {
        throw new Error('Task cancelled');
      }
      lineNumber++;
      bytesRead += Buffer.byteLength(line, 'utf8') + 1; // +1 for newline

      if (lineNumber === 1) {
        // Parse header
        const headerRecords = parse(line + '\n', { trim: true });
        headers = headerRecords[0].map(h => h.toLowerCase());
        continue;
      }

      // Parse data line
      const records = parse(line + '\n', { columns: headers, trim: true });
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

      // Yield control to event loop every 10 titles to prevent UI freezing
      if (linesProcessed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));

        context.reportProgress({
          current: bytesRead,
          max: totalBytes,
          description: `Processing records... ${linesProcessed} titles processed`
        });
      }
    }

    // Final progress report
    context.reportProgress({
      current: bytesRead,
      max: totalBytes,
      description: `Processing records... ${linesProcessed} titles processed`
    });
  }

}

module.exports = ImportWatchmodeTask;

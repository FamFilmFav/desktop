const BackgroundTask = require('./BackgroundTask');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
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
    let columnIndices = null;
    let linesProcessed = 0;

    for await (const line of rl) {
      if (context.isCancelled()) {
        throw new Error('Task cancelled');
      }
      lineNumber++;
      bytesRead += Buffer.byteLength(line, 'utf8') + 1; // +1 for newline
      
      if (lineNumber === 1) {
        // Parse header
        columnIndices = this.parseHeader(line);
        continue;
      }
      
      // Process data line
      const record = this.parseLine(line, columnIndices);
      if (record) {
        models.movies.upsertFromWatchmode(
          record.watchmodeId,
          record.tmdbId,
          record.title,
          record.year
        );
        linesProcessed++;
      }
      
      // Yield control to event loop every 10 lines to prevent UI freezing
      if (linesProcessed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        
        context.reportProgress({ 
          current: bytesRead,
          max: totalBytes,
          description: `Processing records... ${linesProcessed} lines processed`
        });
      }
    }
    
    // Final progress report
    context.reportProgress({ 
      current: bytesRead,
      max: totalBytes,
      description: `Processing records... ${linesProcessed} lines processed`
    });
  }

  parseHeader(headerLine) {
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    const indices = {};
    
    headers.forEach((header, index) => {
      if (header.includes('watchmode') || header === 'id') {
        indices.watchmodeId = index;
      } else if (header.includes('tmdb')) {
        indices.tmdbId = index;
      } else if (header === 'title' || header === 'name') {
        indices.title = index;
      } else if (header === 'year' || header === 'release_year') {
        indices.year = index;
      }
    });
    
    return indices;
  }

  parseLine(line, columnIndices) {
    const parts = line.split(',');
    if (parts.length <= Math.max(columnIndices.watchmodeId || 0, columnIndices.tmdbId || 0, columnIndices.title || 0, columnIndices.year || 0)) {
      return null; // Invalid line
    }
    
    return {
      watchmodeId: parts[columnIndices.watchmodeId]?.trim() || '',
      tmdbId: parts[columnIndices.tmdbId]?.trim() || '',
      title: parts[columnIndices.title]?.trim() || '',
      year: parts[columnIndices.year]?.trim() || ''
    };
  }
}

module.exports = ImportWatchmodeTask;

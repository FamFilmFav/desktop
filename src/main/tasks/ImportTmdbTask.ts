import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import BackgroundTask from './BackgroundTask';
import type { TaskContext } from './BackgroundTask';
import { getModels } from '../database';

type DownloadJsonGzStream = (abortSignal: AbortSignal, dateFileSpec: string) => Promise<NodeJS.ReadableStream>;

export default class ImportTmdbTask extends BackgroundTask {
  private downloader: DownloadJsonGzStream | null;

  constructor(downloader: DownloadJsonGzStream | null = null) {
    super();
    this.downloader = downloader;
  }

  static override get label(): string {
    return 'Import TMDB Database';
  }

  private _getDownloadJsonGzStream(): DownloadJsonGzStream {
    return this.downloader ?? this.downloadJsonGzStream.bind(this);
  }

  async downloadJsonGzStream(abortSignal: AbortSignal, dateFileSpec: string): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      const url = `https://files.tmdb.org/p/exports/movie_ids_${dateFileSpec}.json.gz`;
      const req = https.get(url, { signal: abortSignal }, (res) => {
        resolve(res);
      });
      req.on('error', (err) => reject(err));
    });
  }

  private async downloadJsonGz(abortSignal: AbortSignal, dateFileSpec: string): Promise<string> {
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `tmdb_import_${dateFileSpec}.json.gz`);
    const stream = await this._getDownloadJsonGzStream()(abortSignal, dateFileSpec);
    return new Promise((resolve, reject) => {
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
    });
  }

  private async decompressJson(abortSignal: AbortSignal, dateFileSpec: string): Promise<string> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `tmdb_import_${dateFileSpec}.json.gz`);
    const outputPath = path.join(tempDir, `tmdb_import_${dateFileSpec}.json`);
    return new Promise((resolve, reject) => {
      const inFile = fs.createReadStream(inputPath);
      const gunzip = zlib.createGunzip();
      const outFile = fs.createWriteStream(outputPath);
      inFile.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
      gunzip.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
      outFile.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
      outFile.on('finish', () => {
        outFile.close();
        resolve(outputPath);
      });
      const onAbort = (): void => {
        inFile.destroy();
        gunzip.destroy();
        outFile.destroy();
        reject(new Error('Decompression aborted'));
      };
      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
          return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }
      inFile.pipe(gunzip).pipe(outFile);
    });
  }

  private async processFile(filePath: string, totalBytes: number, context: TaskContext): Promise<void> {
    const models = getModels();
    const fileStream = fs.createReadStream(filePath);
    let bytesRead = 0;
    let buffer = '';
    let linesProcessed = 0;
    let processingPromise: Promise<void> = Promise.resolve();
    let lastProgressTime = Date.now();

    const processLine = async (rawLine: string): Promise<void> => {
      const normalizedLine = rawLine.replace(/[\u2028\u2029]/g, '');
      const record = JSON.parse(normalizedLine) as {
        id?: number;
        original_title?: string;
        popularity?: number;
        video?: boolean;
      } | null;
      if (record) {
        const tmdbId = record.id?.toString() ?? '';
        const title = record.original_title ?? '';
        const popularity = record.popularity ?? null;
        const has_video = record.video ?? false;
        models.movies.upsertFromTmdb(tmdbId, title, popularity, has_video);
        linesProcessed++;
      }
    };

    return new Promise((resolve, reject) => {
      fileStream.on('data', (chunk: Buffer | string) => {
        processingPromise = processingPromise.then(async () => {
          buffer += chunk.toString();
          let index: number;
          while ((index = buffer.indexOf('\n')) !== -1) {
            if (context.isCancelled()) throw new Error('Task cancelled');
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            bytesRead += Buffer.byteLength(line, 'utf8') + 1;
            await processLine(line);
            const currentTime = Date.now();
            if (currentTime - lastProgressTime >= 100) {
              await new Promise((r) => setTimeout(r, 0));
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
        processingPromise
          .then(async () => {
            if (buffer.length > 0) await processLine(buffer);
            context.reportProgress({
              current: totalBytes,
              max: totalBytes,
              description: `Processing records... ${linesProcessed} titles processed`
            });
          })
          .then(resolve)
          .catch(reject);
      });
      fileStream.on('error', reject);
    });
  }

  override async runTask(_args: Record<string, unknown>, context: TaskContext): Promise<void> {
    let gzFilePath: string | null = null;
    let jsonFilePath: string | null = null;
    const today = new Date();
    const dateFileSpec = `${String(today.getMonth() + 1).padStart(2, '0')}_${String(today.getDate()).padStart(2, '0')}_${today.getFullYear()}`;

    try {
      context.reportProgress({ description: 'Downloading data...' });
      gzFilePath = await this.downloadJsonGz(context.abortSignal, dateFileSpec);
      context.reportProgress({ description: 'Decompressing data...' });
      jsonFilePath = await this.decompressJson(context.abortSignal, dateFileSpec);
      context.reportProgress({ description: 'Processing records...' });
      const stats = fs.statSync(jsonFilePath);
      await this.processFile(jsonFilePath, stats.size, context);
      context.reportProgress({ description: 'Complete' });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('Task cancelled');
      if (context.isCancelled()) throw new Error('Task cancelled');
      console.error('ImportTmdbTask error:', error);
      throw error;
    } finally {
      if (gzFilePath && fs.existsSync(gzFilePath)) fs.unlinkSync(gzFilePath);
      if (jsonFilePath && fs.existsSync(jsonFilePath)) fs.unlinkSync(jsonFilePath);
    }
  }
}

/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parse } from 'csv-parse/sync';
import BackgroundTask from './BackgroundTask';
import type { TaskContext } from './BackgroundTask';
import { getModels } from '../database';

type DownloadCsvStream = (abortSignal: AbortSignal) => Promise<NodeJS.ReadableStream>;

export default class ImportWatchmodeTask extends BackgroundTask {
  private downloader: DownloadCsvStream | null;

  constructor(downloader: DownloadCsvStream | null = null) {
    super();
    this.downloader = downloader;
  }

  static override get label(): string {
    return 'Import Watchmode Database';
  }

  private _getDownloadCsvStream(): DownloadCsvStream {
    return this.downloader ?? this.downloadCsvStream.bind(this);
  }

  async downloadCsvStream(abortSignal: AbortSignal): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      const url = 'https://api.watchmode.com/datasets/title_id_map.csv';
      const req = https.get(url, { signal: abortSignal }, (res) => resolve(res));
      req.on('error', (err) => reject(err));
    });
  }

  private async downloadCsv(abortSignal: AbortSignal): Promise<string> {
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `watchmode_import_${Date.now()}.csv`);

    const stream = await this._getDownloadCsvStream()(abortSignal);
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

  private async processFile(filePath: string, totalBytes: number, context: TaskContext): Promise<void> {
    const models = getModels();
    const fileStream = fs.createReadStream(filePath);
    let bytesRead = 0;
    let buffer = '';
    let headers: string[] | null = null;
    let linesProcessed = 0;
    let processingPromise: Promise<void> = Promise.resolve();
    let lastProgressTime = Date.now();

    const processLine = async (rawLine: string): Promise<void> => {
      const normalizedLine = rawLine.replace(/[\u2028\u2029]/g, '');
      if (headers === null) {
        const headerRecords = parse(normalizedLine + '\n', { trim: true }) as string[][];
        headers = headerRecords[0].map((h) => h.toLowerCase());
      } else {
        const records = parse(normalizedLine + '\n', {
          columns: headers as unknown as string[],
          trim: true
        }) as Record<string, string>[];
        const record = records[0];
        if (record) {
          const watchmodeId = record['watchmode id'] ?? '';
          const tmdbType = record['tmdb type'] ?? '';
          const tmdbId = record['tmdb id'] ?? '';
          const title = record['title'] ?? '';
          const year = record['year'] ?? '';

          if (tmdbType.toLowerCase() === 'movie') {
            models.movies.upsertFromWatchmode(watchmodeId, tmdbId, title, year || null);
          }
          linesProcessed++;
        }
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
            if (buffer.length > 0) {
              bytesRead += Buffer.byteLength(buffer, 'utf8');
              await processLine(buffer);
            }
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
    let tempFilePath: string | null = null;

    try {
      context.reportProgress({ description: 'Downloading data...' });
      tempFilePath = await this.downloadCsv(context.abortSignal);

      context.reportProgress({ description: 'Processing records...' });
      const stats = fs.statSync(tempFilePath);
      const totalBytes = stats.size;
      await this.processFile(tempFilePath, totalBytes, context);

      context.reportProgress({ description: 'Complete' });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('Task cancelled');
      if (context.isCancelled()) throw new Error('Task cancelled');
      console.error('ImportWatchmodeTask error:', error);
      throw error;
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
  }
}

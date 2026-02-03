/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import fs from 'fs';
import zlib from 'zlib';
import { Readable } from 'stream';

export type MockDownloadJsonGzStream = (abortSignal: AbortSignal | null, dateFileSpec: string) => Promise<Readable>;
export type MockDownloadCsvStream = (abortSignal: AbortSignal | null) => Promise<Readable>;

export function createMockDownloadJsonGzStream(dataSource: string): MockDownloadJsonGzStream {
  return async function mockDownloadJsonGzStream(
    abortSignal: AbortSignal | null,
    _dateFileSpec: string
  ): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const jsonContent = fs.existsSync(dataSource)
          ? fs.readFileSync(dataSource, 'utf8')
          : dataSource;
        const contentStream = Readable.from([jsonContent]);
        const gzipStream = zlib.createGzip();
        const compressedStream = contentStream.pipe(gzipStream) as Readable;

        if (abortSignal) {
          const onAbort = (): void => {
            contentStream.destroy();
            gzipStream.destroy();
            compressedStream.destroy();
            reject(new Error('Mock download aborted'));
          };
          if (abortSignal.aborted) {
            onAbort();
            return;
          }
          abortSignal.addEventListener('abort', onAbort, { once: true });
        }

        contentStream.on('error', reject);
        gzipStream.on('error', reject);
        resolve(compressedStream);
      } catch (error) {
        reject(error);
      }
    });
  };
}

export function createMockDownloadCsvStream(dataSource: string): MockDownloadCsvStream {
  return async function mockDownloadCsvStream(abortSignal: AbortSignal | null): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const csvContent = fs.existsSync(dataSource)
          ? fs.readFileSync(dataSource, 'utf8')
          : dataSource;
        const contentStream = Readable.from([csvContent]);

        if (abortSignal) {
          const onAbort = (): void => {
            contentStream.destroy();
            reject(new Error('Mock download aborted'));
          };
          if (abortSignal.aborted) {
            onAbort();
            return;
          }
          abortSignal.addEventListener('abort', onAbort, { once: true });
        }

        contentStream.on('error', reject);
        resolve(contentStream);
      } catch (error) {
        reject(error);
      }
    });
  };
}

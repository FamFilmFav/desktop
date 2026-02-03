/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import fs from 'fs';
import zlib from 'zlib';
import { Readable } from 'stream';

/**
 * Creates a mock download function for TMDB that returns a readable stream
 * of gzipped test data.
 *
 * @param dataSource - Either a full file path to a JSON file OR raw JSON content as a string.
 *                     If the string exists as a file, it will be treated as a path.
 *                     Otherwise, it will be treated as raw content.
 */
export function createMockDownloadJsonGzStream(
  dataSource: string
): (
  abortSignal?: AbortSignal,
  dateFileSpec?: unknown
) => Promise<NodeJS.ReadableStream> {
  return async function mockDownloadJsonGzStream(
    abortSignal?: AbortSignal,
    _dateFileSpec?: unknown
  ): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      try {
        let jsonContent: string;

        // Check if dataSource is a file path that exists, or raw content
        if (fs.existsSync(dataSource)) {
          console.debug(dataSource, 'is a file path');
          jsonContent = fs.readFileSync(dataSource, 'utf8');
        } else {
          console.debug(dataSource, 'is raw content');
          jsonContent = dataSource;
        }

        // Create a stream from the content
        const contentStream: Readable = Readable.from([jsonContent]);
        const gzipStream: zlib.Gzip = zlib.createGzip();
        const compressedStream: NodeJS.ReadableStream =
          contentStream.pipe(gzipStream);

        // Handle abort
        if (abortSignal) {
          const onAbort = (): void => {
            contentStream.destroy();
            gzipStream.destroy();
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

/**
 * Creates a mock download function for Watchmode that returns a readable stream
 * of the raw CSV test data.
 *
 * @param dataSource - Either a full file path to a CSV file OR raw CSV content as a string.
 *                     If the string exists as a file, it will be treated as a path.
 *                     Otherwise, it will be treated as raw content.
 */
export function createMockDownloadCsvStream(
  dataSource: string
): (
  abortSignal?: AbortSignal
) => Promise<NodeJS.ReadableStream> {
  return async function mockDownloadCsvStream(
    abortSignal?: AbortSignal
  ): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      try {
        let csvContent: string;

        // Check if dataSource is a file path that exists, or raw content
        if (fs.existsSync(dataSource)) {
          csvContent = fs.readFileSync(dataSource, 'utf8');
        } else {
          csvContent = dataSource;
        }

        // Create a stream from the content
        const contentStream: Readable = Readable.from([csvContent]);

        // Handle abort
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

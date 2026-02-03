/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockDownloadJsonGzStream = createMockDownloadJsonGzStream;
exports.createMockDownloadCsvStream = createMockDownloadCsvStream;
const fs_1 = __importDefault(require("fs"));
const zlib_1 = __importDefault(require("zlib"));
const stream_1 = require("stream");
/**
 * Creates a mock download function for TMDB that returns a readable stream
 * of gzipped test data.
 *
 * @param dataSource - Either a full file path to a JSON file OR raw JSON content as a string.
 *                     If the string exists as a file, it will be treated as a path.
 *                     Otherwise, it will be treated as raw content.
 */
function createMockDownloadJsonGzStream(dataSource) {
    return async function mockDownloadJsonGzStream(abortSignal, _dateFileSpec) {
        return new Promise((resolve, reject) => {
            try {
                let jsonContent;
                // Check if dataSource is a file path that exists, or raw content
                if (fs_1.default.existsSync(dataSource)) {
                    console.debug(dataSource, 'is a file path');
                    jsonContent = fs_1.default.readFileSync(dataSource, 'utf8');
                }
                else {
                    console.debug(dataSource, 'is raw content');
                    jsonContent = dataSource;
                }
                // Create a stream from the content
                const contentStream = stream_1.Readable.from([jsonContent]);
                const gzipStream = zlib_1.default.createGzip();
                const compressedStream = contentStream.pipe(gzipStream);
                // Handle abort
                if (abortSignal) {
                    const onAbort = () => {
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
            }
            catch (error) {
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
function createMockDownloadCsvStream(dataSource) {
    return async function mockDownloadCsvStream(abortSignal) {
        return new Promise((resolve, reject) => {
            try {
                let csvContent;
                // Check if dataSource is a file path that exists, or raw content
                if (fs_1.default.existsSync(dataSource)) {
                    csvContent = fs_1.default.readFileSync(dataSource, 'utf8');
                }
                else {
                    csvContent = dataSource;
                }
                // Create a stream from the content
                const contentStream = stream_1.Readable.from([csvContent]);
                // Handle abort
                if (abortSignal) {
                    const onAbort = () => {
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
            }
            catch (error) {
                reject(error);
            }
        });
    };
}
//# sourceMappingURL=import-background-tasks.mocks.js.map
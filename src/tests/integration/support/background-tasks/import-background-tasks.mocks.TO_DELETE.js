const fs = require('fs');
const zlib = require('zlib');
const { Readable } = require('stream');

/**
 * Creates a mock download function for TMDB that returns a readable stream
 * of gzipped test data
 * 
 * @param {string} dataSource - Either a full file path to a JSON file OR raw JSON content as a string
 *                              If the string exists as a file, it will be treated as a path.
 *                              Otherwise, it will be treated as raw content.
 * @returns {Function} Mock download function that returns a gzipped stream
 * 
 * The stream is gzipped on-the-fly, mimicking the actual HTTPS response
 * 
 * @example
 * // Using a file path
 * const mock = createMockDownloadJsonGzStream('/path/to/movie_ids.json');
 * 
 * // Using raw content
 * const mock = createMockDownloadJsonGzStream('{"id": 1, "title": "Movie"}\\n{"id": 2, "title": "Movie 2"}');
 */
function createMockDownloadJsonGzStream(dataSource) {
  return async function mockDownloadJsonGzStream(abortSignal, dateFileSpec) {
    return new Promise((resolve, reject) => {
      try {
        let jsonContent;

        // Check if dataSource is a file path that exists, or raw content
        if (fs.existsSync(dataSource)) {
          // Treat as file path
          console.debug(dataSource, ' is a file path');
          jsonContent = fs.readFileSync(dataSource, 'utf8');
        } else {
          // Treat as raw content
          console.debug(dataSource, ' is raw content');
          jsonContent = dataSource;
        }

        // Create a stream from the content
        const contentStream = Readable.from([jsonContent]);
        const gzipStream = zlib.createGzip();
        const compressedStream = contentStream.pipe(gzipStream);

        // Handle abort
        if (abortSignal) {
          const onAbort = () => {
            contentStream.destroy();
            gzipStream.destroy();
            compressedStream.destroy();
            reject(new Error('Mock download aborted'));
          };
          if (abortSignal.aborted) {
            return onAbort();
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
 * of the raw CSV test data
 * 
 * @param {string} dataSource - Either a full file path to a CSV file OR raw CSV content as a string
 *                              If the string exists as a file, it will be treated as a path.
 *                              Otherwise, it will be treated as raw content.
 * @returns {Function} Mock download function that returns a raw stream
 * 
 * The stream is not modified, mimicking the actual HTTPS response
 * 
 * @example
 * // Using a file path
 * const mock = createMockDownloadCsvStream('/path/to/title_id_map.csv');
 * 
 * // Using raw content
 * const mock = createMockDownloadCsvStream('watchmode id,tmdb type,tmdb id\\n1,movie,550');
 */
function createMockDownloadCsvStream(dataSource) {
  return async function mockDownloadCsvStream(abortSignal) {
    return new Promise((resolve, reject) => {
      try {
        let csvContent;

        // Check if dataSource is a file path that exists, or raw content
        if (fs.existsSync(dataSource)) {
          // Treat as file path
          csvContent = fs.readFileSync(dataSource, 'utf8');
        } else {
          // Treat as raw content
          csvContent = dataSource;
        }

        // Create a stream from the content
        const contentStream = Readable.from([csvContent]);

        // Handle abort
        if (abortSignal) {
          const onAbort = () => {
            contentStream.destroy();
            reject(new Error('Mock download aborted'));
          };
          if (abortSignal.aborted) {
            return onAbort();
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

module.exports = {
  createMockDownloadJsonGzStream,
  createMockDownloadCsvStream
};

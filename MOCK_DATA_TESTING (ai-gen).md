# Mock Data Testing Guide

## Overview

The `ImportTmdbTask` and `ImportWatchmodeTask` have been refactored to support stream-based mocking for testing purposes. By default, both tasks download files from their respective APIs, but you can provide a `downloader` function when instantiating the tasks for testing.

The key advantage of this approach is that **only the download/fetch part is mocked**. The file-saving logic remains in the task itself, eliminating code duplication.

## Architecture

### Download Flow
1. Task calls `_getDownloadJsonGzStream()` or `_getDownloadCsvStream()`
2. If a `downloader` is provided, it returns the downloader function; otherwise, it returns the real download function
3. The download function (real or downloader) returns a readable stream
4. The task pipes this stream to a file for processing
5. The rest of the task logic (decompression, processing records, etc.) remains unchanged

## Changes Made

### ImportTmdbTask
- **Constructor**: Now accepts an optional `downloader` parameter (defaults to `null`) for providing a mock stream function in tests
- **New Method**: `downloadJsonGzStream()` - Returns a readable stream from HTTPS
- **Updated Method**: `_getDownloadJsonGzStream()` - Returns the downloader function if provided, otherwise the real download method
- **Updated Method**: `downloadJsonGz()` - Now orchestrates stream fetching and file saving

### ImportWatchmodeTask
- **Constructor**: Now accepts an optional `downloader` parameter (defaults to `null`) for providing a mock stream function in tests
- **New Method**: `downloadCsvStream()` - Returns a readable stream from HTTPS
- **Updated Method**: `_getDownloadCsvStream()` - Returns the downloader function if provided, otherwise the real download method
- **Updated Method**: `downloadCsv()` - Now orchestrates stream fetching and file saving

### New Mock Utilities
Created [tests/integration/background-tasks/import-background-tasks.mocks.js](tests/integration/background-tasks/import-background-tasks.mocks.js) with helper functions for mocking import background task downloads:
- `createMockDownloadJsonGzStream(dataSource)`: Creates a mock that returns a gzipped stream. `dataSource` can be either a file path or raw JSON content string.
- `createMockDownloadCsvStream(dataSource)`: Creates a mock that returns a raw stream. `dataSource` can be either a file path or raw CSV content string.

## Usage in Tests

### Using TMDB Mock Data with File Path
```javascript
const ImportTmdbTask = require('../src/tasks/ImportTmdbTask');
const { createMockDownloadJsonGzStream } = require('../src/tasks/test-mocks');
const path = require('path');

// Use a file path
const testDataPath = path.join(__dirname, '../test-double-data/tmdb/import/movie_ids.json');
const downloader = createMockDownloadJsonGzStream(testDataPath);
const task = new ImportTmdbTask(downloader);

await task.runTask(args, context);
```

### Using TMDB Mock Data with Raw Content
```javascript
const ImportTmdbTask = require('../src/tasks/ImportTmdbTask');
const { createMockDownloadJsonGzStream } = require('../src/tasks/test-mocks');

// Use raw content directly
const jsonContent = '{"id": 1, "original_title": "Test Movie", "popularity": 10, "video": false}\n{"id": 2, "original_title": "Another Movie", "popularity": 20, "video": false}';
const downloader = createMockDownloadJsonGzStream(jsonContent);
const task = new ImportTmdbTask(downloader);

await task.runTask(args, context);
```

### Using Watchmode Mock Data with File Path
```javascript
const ImportWatchmodeTask = require('../src/tasks/ImportWatchmodeTask');
const { createMockDownloadCsvStream } = require('../src/tasks/test-mocks');
const path = require('path');

// Use a file path
const testDataPath = path.join(__dirname, '../test-double-data/watchmode/import/title_id_map.csv');
const downloader = createMockDownloadCsvStream(testDataPath);
const task = new ImportWatchmodeTask(downloader);

await task.runTask(args, context);
```

### Using Watchmode Mock Data with Raw Content
```javascript
const ImportWatchmodeTask = require('../src/tasks/ImportWatchmodeTask');
const { createMockDownloadCsvStream } = require('../src/tasks/test-mocks');

// Use raw content directly
const csvContent = 'watchmode id,tmdb type,tmdb id,title,year\n1,movie,550,Fight Club,1999\n2,movie,680,Pulp Fiction,1994';
const downloader = createMockDownloadCsvStream(csvContent);
const task = new ImportWatchmodeTask(downloader);

await task.runTask(args, context);
```

### Testing Different Scenarios

The mock functions accept any data source, allowing tests to exercise different code paths:

```javascript
const ImportTmdbTask = require('../src/tasks/ImportTmdbTask');
const { createMockDownloadJsonGzStream } = require('../src/tasks/test-mocks');
const path = require('path');

// Test 1: Use standard test data
const testDataPath1 = path.join(__dirname, '../test-double-data/tmdb/import/movie_ids.json');
const downloader1 = createMockDownloadJsonGzStream(testDataPath1);
const task1 = new ImportTmdbTask(downloader1);

// Test 2: Use edge case data (empty file, large file, malformed data, etc.)
const testDataPath2 = path.join(__dirname, '../test-double-data/tmdb/import/edge-case.json');
const downloader2 = createMockDownloadJsonGzStream(testDataPath2);
const task2 = new ImportTmdbTask(downloader2);

// Each test can now exercise different code paths
await task1.runTask(args1, context1);  // Tests normal flow
await task2.runTask(args2, context2);  // Tests edge cases
```

### Using Real Data (Default Behavior)
```javascript
const ImportTmdbTask = require('../src/tasks/ImportTmdbTask');

// No downloader provided - uses real download
const task = new ImportTmdbTask();
await task.runTask(args, context);
```

## Integration Tests

An integration test suite has been created in [tests/integration/background-tasks/import/import.test.js](tests/integration/background-tasks/import/import.test.js) that:

1. **Setup**: Creates an in-memory SQLite database and imports test data from both TMDB and Watchmode sources
2. **Tests**: Validates the import behavior:
   - Verifies exactly 24 movies are imported to the database
   - Confirms that TMDB ID 1622513 has no year value (edge case where Watchmode data has no year)
   - Confirms that Watchmode ID 11083261 has no popularity value (edge case where TMDB data has no matching record)
3. **Cleanup**: Removes all test data from the database after tests complete

This test demonstrates the mocking capabilities in action, allowing the import tasks to run completely offline using test data files.

1. **Clean Separation**: Only the download/fetch part is mocked, not the file saving
2. **No Code Duplication**: File-saving logic stays in the task
3. **Testability**: Tests can run without requiring actual API connections
4. **Speed**: Mock data tests are faster than downloading from APIs
5. **Reliability**: No dependency on external services during testing
6. **Stream-Based**: Mocks return streams, matching the behavior of real HTTP responses
7. **Backward Compatible**: Existing code continues to work without changes
8. **Flexible Input**: Mock data can come from files or inline strings

## Test Data Files

- TMDB: [tests/test-double-data/tmdb/import/movie_ids.json](tests/test-double-data/tmdb/import/movie_ids.json)
- Watchmode: [tests/test-double-data/watchmode/import/title_id_map.csv](tests/test-double-data/watchmode/import/title_id_map.csv)

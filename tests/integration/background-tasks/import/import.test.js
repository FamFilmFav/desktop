const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

let app;

// Setup: Create in-memory database and run both import tasks
test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'] });

    app.on('console', msg => {
      console.log('[app]', msg.text());
    }); 
    
  const result = await app.evaluate(async ( window ) => {
    global.__testHooks.db.initMockDatabase();

    await global.__testHooks.data.loadStubWatchmodeData('./tests/test-double-data/watchmode/import/title_id_map.csv');
    await global.__testHooks.data.loadStubTmdbData('./tests/test-double-data/tmdb/import/movie_ids.json');
  });
});

// Test 0: For app integration troubleshooting
test('should not throw errors', async () => {
  const info = await app.evaluate(() => {
    return {
      hasProcess: typeof process !== 'undefined',
      hasVersions: typeof process?.versions,
      electron: process?.versions?.electron,
      node: process?.versions?.node,
      sandboxed: process?.sandboxed,
      hasRequire: typeof require,
      appPath: global.__testHooks ? global.__testHooks.app.getAppPath() : 'no testApi',
      dbStatus: global.__testHooks ? global.__testHooks.db.getStatus() : 'no testApi'
    };
  });

  console.log(info);
});


// Test 1: Verify 23 rows in movies table
test('should have 23 movies in the database', async () => {
  const window = await app.firstWindow();
  const result = await window.evaluate(async () => {
    return await window.electron.movies.getAll();
  });

  expect(result.success).toBe(true);
  expect(result.data.length).toBe(23);
});

// Test 2: Verify TMDB ID 1622513 has NO year value
test('should not have year value for TMDB ID 1622513', async () => {
  const window = await app.firstWindow();
  const result = await window.evaluate(async () => {
    return await window.electron.movies.getByTmdbId(1622513);
  });

  expect(result).toBeDefined();
  expect(result.year).toBeUndefined();
});

// Test 3: Verify Watchmode ID 11083261 has NO popularity value
test('should not have popularity value for Watchmode ID 11083261', async () => {
  const window = await app.firstWindow();
  const result = await window.evaluate(async () => {
    return await window.electron.movies.getByWatchdogId(11083261) ;
  });

  expect(result).toBeDefined();
  expect(result.popularity).toBeUndefined();
});

// Cleanup: Delete all rows from movies table
test.afterAll(async () => {
  await app.evaluate(async ( window ) => {
    global.__testHooks.db.closeDatabase();
  });
  
  await app.close();
});

const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test('db is connected', async () => {
  const app = await electron.launch({ args: ['.'] });

  const window = await app.firstWindow();

  window.on('console', msg => {
    console.log('[renderer]', msg.text());
    }); 

  const status = await window.evaluate(async () => {
    return window.testApi.getDbStatus();
  });

  expect(status.dbConnected).toBe(true);

  // Searching for a movie should connect to the database
  const search = await window.evaluate(async () => {
    return window.electron.movies.searchByTitle('sd;flas;dflkj This movie should not exist');
  });

  expect(search.success).toBe(true);
  expect(search.data.length).toBe(0);

  await app.close();
});
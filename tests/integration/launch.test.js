const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test('Electron app launches', async () => {
  const app = await electron.launch({
    args: ['.'],
  });

  const window = await app.firstWindow();
  const title = await window.title();

  expect(title).toBeTruthy();

  await app.close();
});
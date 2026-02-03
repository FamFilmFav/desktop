/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test('Electron app launches', async () => {
  const debugArgs = process.env.PWDEBUG ? ['--inspect=9229'] : [];
  const app = await electron.launch({ args: ['.', ...debugArgs] });
  const window = await app.firstWindow();
  const title = await window.title();
  expect(title).toBeTruthy();
  await app.close();
});

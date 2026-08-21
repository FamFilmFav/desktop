/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { ipcMain } from 'electron';

import * as db from '../../database';

import { registerAppIpcHandlers } from './app';
import { registerBackgroundTaskIpcHandlers } from './background-tasks';
import { registerMovieIpcHandlers } from './movies';
import { broadcast, setWindow } from './notifications';
import { registerSettingsIpcHandlers } from './settings';
import { registerUserIpcHandlers } from './users';

export { broadcast, setWindow };

export function registerIpcHandlers(): void {
  registerAppIpcHandlers();
  registerBackgroundTaskIpcHandlers();
  registerMovieIpcHandlers();
  registerSettingsIpcHandlers();
  registerUserIpcHandlers();

  if (process.env.NODE_ENV === 'test') {
    if (ipcMain.listenerCount('test:get-db-status') === 0) {
      ipcMain.handle('test:get-db-status', async () => db.getStatus());
    }
  }
}

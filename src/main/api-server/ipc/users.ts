/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { ipcMain } from 'electron';

import type { FirstAdminUserData } from '../../services/UserService';

import { userService } from './instances';

export function registerUserIpcHandlers(): void {
  ipcMain.handle('users-has-users', () => userService.hasUsers());
  ipcMain.handle('users-create-first-admin', (_event, data: FirstAdminUserData) =>
    userService.createFirstAdmin(data),
  );
}

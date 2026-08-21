/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { Express, Request } from 'express';

import type { FirstAdminUserData } from '../../services/UserService';
import { userService } from '../ipc/instances';

import { route } from './utils';

export function registerUserRoutes(app: Express): void {
  app.get(
    '/api/users/has-users',
    route(() => userService.hasUsers()),
  );

  app.post(
    '/api/users/bootstrap-admin',
    route((req: Request) => userService.createFirstAdmin(req.body as FirstAdminUserData)),
  );
}

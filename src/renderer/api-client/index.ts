/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { createHttpApiClient } from './http';
import { ApiClient } from './types';

interface ElectronWindow extends Window {
  electron?: ApiClient;
}

export function createApiClient(): ApiClient {
  if (typeof window !== 'undefined') {
    const win = window as ElectronWindow;
    if (win.electron) {
      return win.electron;
    }
  }

  return createHttpApiClient();
}

export * from './http';
export * from './types';

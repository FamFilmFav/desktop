/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  app: {
    getAppVersion: () => Promise<string>;
    getAppLocale: () => Promise<string>;
    getServerPort: () => Promise<number>;
    openSettings: () => Promise<void>;
    getLocaleFile: (namespace: string, language: string) => Promise<Record<string, string>>;
    saveMissingKey?: (
      namespace: string,
      language: string,
      key: string,
      fallbackValue: string,
    ) => Promise<void>;
  };
  backgroundTasks: {
    enqueueBackgroundTask: (taskType: string, args?: Record<string, unknown>) => Promise<unknown>;
    getBackgroundTasks: () => Promise<{ active: unknown; queue: unknown[] }>;
    cancelActiveBackgroundTask: () => Promise<unknown>;
    removeQueuedBackgroundTask: (taskId: string) => Promise<unknown>;
    onBackgroundTaskUpdate: (
      callback: (state: { active: unknown; queue: unknown[] }) => void,
    ) => () => void;
  };
  movies: {
    create: (movieData: unknown) => Promise<unknown>;
    getById: (id: number) => Promise<unknown>;
    getByWatchmodeId: (watchmodeId: string) => Promise<unknown>;
    getByTmdbId: (tmdbId: string) => Promise<unknown>;
    getAll: () => Promise<unknown>;
    update: (id: number, movieData: unknown) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
    searchByTitle: (searchTerm: string) => Promise<unknown>;
  };
  settings: {
    loadSettings: () => Promise<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: string;
    }>;
    saveSettings: (
      settings: Record<string, unknown>,
    ) => Promise<{ success: boolean; error?: string }>;
    onSettingsSaved: (callback: () => void) => void;
  };
  users: {
    hasUsers: () => Promise<boolean>;
    createFirstAdmin: (data: {
      username: string;
      email?: string | null;
      password?: string;
      displayName?: string | null;
    }) => Promise<unknown>;
  };
}

contextBridge.exposeInMainWorld('electron', {
  app: {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppLocale: () => ipcRenderer.invoke('get-app-locale'),
    getServerPort: () => ipcRenderer.invoke('get-server-port'),
    openSettings: () => ipcRenderer.invoke('open-settings'),
    getLocaleFile: (namespace: string, language: string) =>
      ipcRenderer.invoke('locale-get', namespace, language),
    saveMissingKey: (namespace: string, language: string, key: string, fallbackValue: string) =>
      ipcRenderer.invoke('locale-missing-key', namespace, language, key, fallbackValue),
  },
  backgroundTasks: {
    enqueueBackgroundTask: (taskType: string, args?: Record<string, unknown>) =>
      ipcRenderer.invoke('enqueue-background-task', taskType, args ?? {}),
    getBackgroundTasks: () => ipcRenderer.invoke('get-background-tasks'),
    cancelActiveBackgroundTask: () => ipcRenderer.invoke('cancel-active-background-task'),
    removeQueuedBackgroundTask: (taskId: string) =>
      ipcRenderer.invoke('remove-queued-background-task', taskId),
    onBackgroundTaskUpdate: (callback: (state: { active: unknown; queue: unknown[] }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { active: unknown; queue: unknown[] },
      ) => callback(data);
      ipcRenderer.on('background-task-update', handler);
      return () => ipcRenderer.removeListener('background-task-update', handler);
    },
  },
  movies: {
    create: (movieData: unknown) => ipcRenderer.invoke('movies-create', movieData),
    getById: (id: number) => ipcRenderer.invoke('movies-get-by-id', id),
    getByWatchmodeId: (watchmodeId: string) =>
      ipcRenderer.invoke('movies-get-by-watchmode-id', watchmodeId),
    getByTmdbId: (tmdbId: string) => ipcRenderer.invoke('movies-get-by-tmdb-id', tmdbId),
    getAll: () => ipcRenderer.invoke('movies-get-all'),
    update: (id: number, movieData: unknown) => ipcRenderer.invoke('movies-update', id, movieData),
    delete: (id: number) => ipcRenderer.invoke('movies-delete', id),
    searchByTitle: (searchTerm: string) => ipcRenderer.invoke('movies-search-by-title', searchTerm),
  },
  settings: {
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings: Record<string, unknown>) =>
      ipcRenderer.invoke('save-settings', settings),
    onSettingsSaved: (callback: () => void) => {
      ipcRenderer.on('settings-saved', () => callback());
    },
  },
  users: {
    hasUsers: () => ipcRenderer.invoke('users-has-users'),
    createFirstAdmin: (data) => ipcRenderer.invoke('users-create-first-admin', data),
  },
} as ElectronAPI);

if (process.env.ELECTRON_START_URL) {
  contextBridge.exposeInMainWorld('isDevMode', true);
}

if (process.env.NODE_ENV === 'test') {
  contextBridge.exposeInMainWorld('testApi', {
    db: {
      getStatus: () => ipcRenderer.invoke('test:get-db-status'),
    },
  });
}

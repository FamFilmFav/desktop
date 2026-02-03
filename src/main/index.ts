/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { app, BrowserWindow, Menu, Tray, ipcMain } from 'electron';
import path from 'path';
import express from 'express';
import * as server from './server';
import * as db from './database';
import SettingsManager from './settings-manager';
import * as backgroundTaskManager from './background-task-manager';
import type { TestHooks } from './testing/TestHooksImpl';
import { getTestHooks } from './testing/TestHooksImpl';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const webServer = express();
const settingsManager = new SettingsManager();

if (process.env.NODE_ENV === 'development') {
  require('electron-reloader')(module, {
    watchRenderer: false
  })
}

function handleWindowClosed(): void {
  mainWindow = null;
}

function createAppWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  mainWindow.on('closed', handleWindowClosed);

  backgroundTaskManager.setNotifyFn(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('background-task-update', backgroundTaskManager.getState());
    }
  });
}

function createSettingsWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open App',
      click: () => {
        if (mainWindow === null) {
          createAppWindow();
        } else {
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Family Watch Night');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow === null) {
      createAppWindow();
    } else {
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    if (mainWindow === null) {
      createAppWindow();
    } else {
      mainWindow.focus();
    }
  });
}

app.on('ready', () => {
  db.initDatabase();
  settingsManager.initialize();
  createTray();
  createAppWindow();

  try {
    const port = (settingsManager.get('webPort') as number) || 3000;
    server.startServer(webServer, port);
  } catch (error) {
    console.error('Failed to load settings, using default port:', (error as Error).message);
    server.startServer(webServer, 3000);
  }
});

app.on('window-all-closed', () => {});

app.on('activate', () => {
  if (mainWindow === null && process.platform === 'darwin') {
    createAppWindow();
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-server-port', () => (settingsManager.get('webPort') as number) || 3000);
ipcMain.handle('open-settings', () => createSettingsWindow());

ipcMain.handle('load-settings', () => {
  try {
    const settings = settingsManager.getAll();
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error loading settings:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-settings', async (_event, settings: Record<string, unknown>) => {
  try {
    settingsManager.setAll(settings);
    console.info('Settings saved:', settings);
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('enqueue-background-task', (_event, taskType: string, args: Record<string, unknown>) =>
  backgroundTaskManager.enqueue(taskType as import('./tasks/task-registry').TaskRegistryType, args ?? {})
);
ipcMain.handle('get-background-tasks', () => backgroundTaskManager.getState());
ipcMain.handle('cancel-active-background-task', () => backgroundTaskManager.cancelActive());
ipcMain.handle('remove-queued-background-task', (_event, taskId: string) =>
  backgroundTaskManager.removeQueued(taskId)
);

ipcMain.handle('movies-create', (_event, movieData: unknown) => {
  try {
    const models = db.getModels();
    const id = models.movies.create(movieData as Parameters<typeof models.movies.create>[0]);
    return { success: true, data: id };
  } catch (error) {
    console.error('Error creating movie:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('movies-get-by-id', (_event, id: number) => {
  try {
    const models = db.getModels();
    const movie = models.movies.getById(id);
    return { success: true, data: movie };
  } catch (error) {
    console.error('Error getting movie by ID:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('movies-get-by-watchdog-id', (_event, watchdogId: string) => {
  try {
    const models = db.getModels();
    const movie = models.movies.getByWatchmodeId(watchdogId);
    return { success: true, data: movie };
  } catch (error) {
    console.error('Error getting movie by Watchdog ID:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('movies-get-by-tmdb-id', (_event, tmdbId: string) => {
  try {
    const models = db.getModels();
    const movie = models.movies.getByTmdbId(tmdbId);
    return { success: true, data: movie };
  } catch (error) {
    console.error('Error getting movie by TMDB ID:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('movies-get-all', () => {
  try {
    const models = db.getModels();
    const movies = models.movies.getAll();
    return { success: true, data: movies };
  } catch (error) {
    console.error('Error getting all movies:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('movies-update', (_event, id: number, movieData: unknown) => {
  try {
    const models = db.getModels();
    const success = models.movies.update(id, movieData as Parameters<typeof models.movies.update>[1]);
    return { success };
  } catch (error) {
    console.error('Error updating movie:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('movies-delete', (_event, id: number) => {
  try {
    const models = db.getModels();
    const success = models.movies.delete(id);
    return { success };
  } catch (error) {
    console.error('Error deleting movie:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('movies-search-by-title', (_event, searchTerm: string) => {
  try {
    const models = db.getModels();
    const movies = models.movies.searchByTitle(searchTerm);
    return { success: true, data: movies };
  } catch (error) {
    console.error('Error searching movies by title:', (error as Error).message);
    return { success: false, error: (error as Error).message };
  }
});

if (process.env.NODE_ENV === 'test') {

  // If NODE_ENV is set to 'test', register the hooks used for integration testing.
  // Node that build:main populates the testing directory with no-op implementations,
  // and build:main:for-integration-testing populates it with the active implementations,
  // so this code only runs when the testing-active scripts have been used.

  const appWithTestHooks = app as typeof app & {
    testHooks?: TestHooks;
  };

  appWithTestHooks.testHooks = getTestHooks();

  // TODO: Consider replacing the ipcMain handlers below with direct calls to the testHooks methods.

  ipcMain.handle('test:get-db-status', async () => db.getStatus());

  (global as unknown as { __testCallbacks: { createTaskContext: () => import('./tasks/BackgroundTask').TaskContext } }).__testCallbacks = {
    createTaskContext: () => ({
      abortSignal: null as unknown as AbortSignal,
      reportProgress: () => {},
      isCancelled: () => false
    })
  };
}

app.on('before-quit', () => {
  db.closeDatabase();
});

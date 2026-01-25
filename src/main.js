const { app, BrowserWindow, Menu, Tray, ipcMain, dialog } = require('electron');
const path = require('path');
const express = require('express');
const server = require('./server');
const db = require('./database');
const SettingsManager = require('./settings-manager');
const backgroundTaskManager = require('./background-task-manager');

let mainWindow = null;
let tray = null;
const webServer = express();
const settingsManager = new SettingsManager();

// Handle window closed
function handleWindowClosed() {
  mainWindow = null;
}

// Create DOM-based UI Window
function createAppWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  // If a dev server URL is provided, load it to enable HMR / Fast Refresh.
  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
  }
  mainWindow.on('closed', handleWindowClosed);

  backgroundTaskManager.setNotifyFn(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('background-task-update', backgroundTaskManager.getState());
    }
  });

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

// Create Tray Icon
function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
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

  tray.setToolTip('FamFilmFav');
  tray.setContextMenu(contextMenu);

  // Open app on tray icon click
  tray.on('click', () => {
    if (mainWindow === null) {
      createAppWindow();
    } else {
      mainWindow.focus();
    }
  });

  // Open app on tray icon double-click (Windows/Linux)
  tray.on('double-click', () => {
    if (mainWindow === null) {
      createAppWindow();
    } else {
      mainWindow.focus();
    }
  });
}

// App event handlers
app.on('ready', () => {
  // Initialize database
  db.initDatabase();
  
  // Initialize settings manager
  settingsManager.initialize();
  
  createTray();
  createAppWindow();

  // Load settings and start server with configured port
  try {
    const port = settingsManager.get('webPort') || 3000;
    server.startServer(webServer, port);
  } catch (error) {
    console.error('Failed to load settings, using default port:', error.message);
    server.startServer(webServer, 3000);
  }
});

app.on('window-all-closed', () => {
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null && process.platform === 'darwin') {
    createAppWindow();
  }
});

// Handle IPC messages
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-server-port', () => {
  return settingsManager.get('webPort') || 3000;
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('load-settings', () => {
  try {
    const settings = settingsManager.getAll();
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error loading settings:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    settingsManager.setAll(settings);
    console.log('Settings saved:', settings);
    return { success: true }
  } catch (error) {
    console.error('Error saving settings:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('enqueue-background-task', (event, taskType, args) => {
  return backgroundTaskManager.enqueue(taskType, args ?? {});
});

ipcMain.handle('get-background-tasks', () => {
  return backgroundTaskManager.getState();
});

// Movies database operations
ipcMain.handle('movies-create', (event, movieData) => {
  try {
    const models = db.getModels();
    const id = models.movies.create(movieData);
    return { success: true, data: id };
  } catch (error) {
    console.error('Error creating movie:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('movies-get-by-id', (event, id) => {
  try {
    const models = db.getModels();
    const movie = models.movies.getById(id);
    return { success: true, data: movie };
  } catch (error) {
    console.error('Error getting movie by ID:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('movies-get-by-watchdog-id', (event, watchdogId) => {
  try {
    const models = db.getModels();
    const movie = models.movies.getByWatchdogId(watchdogId);
    return { success: true, data: movie };
  } catch (error) {
    console.error('Error getting movie by Watchdog ID:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('movies-get-by-tmdb-id', (event, tmdbId) => {
  try {
    const models = db.getModels();
    const movie = models.movies.getByTmdbId(tmdbId);
    return { success: true, data: movie };
  } catch (error) {
    console.error('Error getting movie by TMDB ID:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('movies-get-all', () => {
  try {
    const models = db.getModels();
    const movies = models.movies.getAll();
    return { success: true, data: movies };
  } catch (error) {
    console.error('Error getting all movies:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('movies-update', (event, id, movieData) => {
  try {
    const models = db.getModels();
    const success = models.movies.update(id, movieData);
    return { success };
  } catch (error) {
    console.error('Error updating movie:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('movies-delete', (event, id) => {
  try {
    const models = db.getModels();
    const success = models.movies.delete(id);
    return { success };
  } catch (error) {
    console.error('Error deleting movie:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('movies-search-by-title', (event, searchTerm) => {
  try {
    const models = db.getModels();
    const movies = models.movies.searchByTitle(searchTerm);
    return { success: true, data: movies };
  } catch (error) {
    console.error('Error searching movies by title:', error.message);
    return { success: false, error: error.message };
  }
});

app.on('before-quit', () => {
  db.closeDatabase()
});

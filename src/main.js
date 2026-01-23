const { app, BrowserWindow, Menu, Tray, ipcMain, dialog } = require('electron');
const path = require('path');
const express = require('express');
const server = require('./server');

let mainWindow = null;
let settingsWindow = null;
let tray = null;
const webServer = express();

// Handle window closed
function handleWindowClosed() {
  mainWindow = null;
}

function handleSettingsWindowClosed() {
  settingsWindow = null;
}

// Create Settings Window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 400,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../src/settings.html'));
  settingsWindow.on('closed', handleSettingsWindowClosed);

  // Open DevTools in development
  // settingsWindow.webContents.openDevTools();
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

  mainWindow.loadFile(path.join(__dirname, '../src/app.html'));
  mainWindow.on('closed', handleWindowClosed);

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
    {
      label: 'Settings',
      click: () => createSettingsWindow()
    },
    {
      label: 'Open in Browser',
      click: () => {
        require('electron').shell.openExternal('http://localhost:3000');
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
  createTray();
  
  // Start internal web server
  server.startServer(webServer, 3000);
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

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('save-settings', async (event, settings) => {
  // TODO: Persist settings to disk
  console.log('Settings saved:', settings);
  return { success: true };
});

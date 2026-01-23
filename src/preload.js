const { contextBridge, ipcRenderer } = require('electron');

// Expose only what's needed
contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  // Allow receiving messages from main process
  onSettingsSaved: (callback) => {
    ipcRenderer.on('settings-saved', callback);
  }
});

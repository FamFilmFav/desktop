const { contextBridge, ipcRenderer } = require('electron');

// Expose only what's needed
contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  // Allow receiving messages from main process
  onSettingsSaved: (callback) => {
    ipcRenderer.on('settings-saved', callback);
  },
  enqueueBackgroundTask: (taskType, args) =>
    ipcRenderer.invoke('enqueue-background-task', taskType, args ?? {}),
  getBackgroundTasks: () => ipcRenderer.invoke('get-background-tasks'),
  onBackgroundTaskUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('background-task-update', handler);
    return () => ipcRenderer.removeListener('background-task-update', handler);
  }
});

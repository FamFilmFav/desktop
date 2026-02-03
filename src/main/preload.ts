import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getServerPort: () => Promise<number>;
  openSettings: () => Promise<void>;
  loadSettings: () => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }>;
  saveSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  onSettingsSaved: (callback: () => void) => void;
  enqueueBackgroundTask: (taskType: string, args?: Record<string, unknown>) => Promise<unknown>;
  getBackgroundTasks: () => Promise<{ active: unknown; queue: unknown[] }>;
  cancelActiveBackgroundTask: () => Promise<unknown>;
  removeQueuedBackgroundTask: (taskId: string) => Promise<unknown>;
  onBackgroundTaskUpdate: (callback: (state: { active: unknown; queue: unknown[] }) => void) => () => void;
  movies: {
    create: (movieData: unknown) => Promise<unknown>;
    getById: (id: number) => Promise<unknown>;
    getByWatchdogId: (watchdogId: string) => Promise<unknown>;
    getByTmdbId: (tmdbId: string) => Promise<unknown>;
    getAll: () => Promise<unknown>;
    update: (id: number, movieData: unknown) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
    searchByTitle: (searchTerm: string) => Promise<unknown>;
  };
}

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('save-settings', settings),
  onSettingsSaved: (callback: () => void) => {
    ipcRenderer.on('settings-saved', () => callback());
  },
  enqueueBackgroundTask: (taskType: string, args?: Record<string, unknown>) =>
    ipcRenderer.invoke('enqueue-background-task', taskType, args ?? {}),
  getBackgroundTasks: () => ipcRenderer.invoke('get-background-tasks'),
  cancelActiveBackgroundTask: () => ipcRenderer.invoke('cancel-active-background-task'),
  removeQueuedBackgroundTask: (taskId: string) => ipcRenderer.invoke('remove-queued-background-task', taskId),
  onBackgroundTaskUpdate: (callback: (state: { active: unknown; queue: unknown[] }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { active: unknown; queue: unknown[] }) =>
      callback(data);
    ipcRenderer.on('background-task-update', handler);
    return () => ipcRenderer.removeListener('background-task-update', handler);
  },
  movies: {
    create: (movieData: unknown) => ipcRenderer.invoke('movies-create', movieData),
    getById: (id: number) => ipcRenderer.invoke('movies-get-by-id', id),
    getByWatchdogId: (watchdogId: string) => ipcRenderer.invoke('movies-get-by-watchdog-id', watchdogId),
    getByTmdbId: (tmdbId: string) => ipcRenderer.invoke('movies-get-by-tmdb-id', tmdbId),
    getAll: () => ipcRenderer.invoke('movies-get-all'),
    update: (id: number, movieData: unknown) => ipcRenderer.invoke('movies-update', id, movieData),
    delete: (id: number) => ipcRenderer.invoke('movies-delete', id),
    searchByTitle: (searchTerm: string) => ipcRenderer.invoke('movies-search-by-title', searchTerm)
  }
} as ElectronAPI);

if (process.env.NODE_ENV === 'test') {
  contextBridge.exposeInMainWorld('testApi', {
    db: {
      getStatus: () => ipcRenderer.invoke('test:get-db-status')
    }
  });
}

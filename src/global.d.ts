declare global {
  interface Window {
    electron?: {
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
      movies: Record<string, (...args: unknown[]) => Promise<unknown>>;
    };
  }
}

export {};

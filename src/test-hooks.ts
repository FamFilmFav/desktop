import { app } from 'electron';
import * as db from './database';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createMockDownloadJsonGzStream, createMockDownloadCsvStream } = require('../tests/integration/background-tasks/import-background-tasks.mocks');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImportTmdbTask = require('./tasks/ImportTmdbTask').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImportWatchmodeTask = require('./tasks/ImportWatchmodeTask').default;

export interface TestHooks {
  app: { getAppPath: () => string; isReady: () => boolean };
  db: {
    getStatus: () => { dbInitialized: boolean; dbConnected: boolean };
    initMockDatabase: (testDb?: unknown) => void;
    closeDatabase: () => void;
  };
  data: {
    loadStubTmdbData: (dataSource: string) => Promise<void>;
    loadStubWatchmodeData: (dataSource: string) => Promise<void>;
  };
}

export function registerTestHooks(): TestHooks {
  return {
    app: {
        getAppPath: () => app.getAppPath(),
        isReady: () => app.isReady()
    },
    db: {
      getStatus: () => db.getStatus(),
      initMockDatabase: (testDb?: unknown) => db.initMockDatabase(testDb as InstanceType<typeof import('better-sqlite3')> | null),
      closeDatabase: () => db.closeDatabase()
    },
    data: {
      async loadStubTmdbData (dataSource: string) {
        const tmdbDownloader = createMockDownloadJsonGzStream(dataSource);
        const tmdbTask = new ImportTmdbTask(tmdbDownloader);
        await tmdbTask.runTask({}, (global as unknown as { __testCallbacks: { createTaskContext: () => import('./tasks/BackgroundTask').TaskContext } }).__testCallbacks.createTaskContext());
      },
      async loadStubWatchmodeData (dataSource: string) {
        const watchmodeDownloader = createMockDownloadCsvStream(dataSource);
        const watchmodeTask = new ImportWatchmodeTask(watchmodeDownloader);
        await watchmodeTask.runTask({}, (global as unknown as { __testCallbacks: { createTaskContext: () => import('./tasks/BackgroundTask').TaskContext } }).__testCallbacks.createTaskContext());
      }
    }
  };
}

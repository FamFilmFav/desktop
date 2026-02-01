import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import type { ElectronApplication } from 'playwright';
import { MovieData } from '../../../../src/db/models/Movies';

let app: ElectronApplication;

test.beforeAll(async () => {
  const debugArgs = process.env.PWDEBUG ? ['--inspect-brk=9229'] : [];
  app = await electron.launch({ args: ['.', ...debugArgs] });
  app.on('console', (msg) => {
    console.log('[app]', msg.text());
  });

  await app.evaluate(async ({ app }) => {
    const appWithTestHooks = app as typeof app & {
      testHooks?: {
        db: { initMockDatabase: () => void }
        data: { loadStubWatchmodeData: (p: string) => Promise<void>; loadStubTmdbData: (p: string) => Promise<void> }
      };
    };

    if (!appWithTestHooks.testHooks) {
      throw new Error('Test hooks not available');
    }

    appWithTestHooks.testHooks.db.initMockDatabase();
    await appWithTestHooks.testHooks.data.loadStubWatchmodeData('./tests/test-double-data/watchmode/import/title_id_map.csv');
    await appWithTestHooks.testHooks.data.loadStubTmdbData('./tests/test-double-data/tmdb/import/movie_ids.json');  
  });
});

test('should not throw errors', async () => {
  const info = await app.evaluate(() => {
    const g = global as unknown as { __testHooks?: { app: { getAppPath: () => string } } };
    return {
      hasProcess: typeof process !== 'undefined',
      hasVersions: typeof (process as NodeJS.Process).versions,
      electron: (process as NodeJS.Process).versions?.electron,
      node: (process as NodeJS.Process).versions?.node,
      sandboxed: (process as NodeJS.Process & { sandboxed?: boolean }).sandboxed,
      hasRequire: typeof require,
      appPath: g.__testHooks ? g.__testHooks.app.getAppPath() : 'no testApi',
    };
  });
});

test('should have 23 movies in the database', async () => {
  const window = await app.firstWindow();
  const result = await window.evaluate(async () => {
    const w = window as unknown as { electron: { movies: { getAll: () => Promise<{ success: boolean; data: unknown[] }> } } };
    return await w.electron.movies.getAll();
  });
  expect(result.success).toBe(true);
  expect(result.data.length).toBe(23);
});

test('should not have year value for TMDB ID 1622513', async () => {
  const window = await app.firstWindow();
  const result = await window.evaluate(async () => {
    const w = window as unknown as { electron: { movies: { getByTmdbId: (id: string) => Promise<{ data?: MovieData }> } } };
    return await w.electron.movies.getByTmdbId('1622513');
  });
  expect(result.data).toBeDefined();
  expect(result.data!.year).toBeNull();
});

test('should not have popularity value for Watchmode ID 11083261', async () => {
  const window = await app.firstWindow();
  const result = await window.evaluate(async () => {
    const w = window as unknown as { electron: { movies: { getByWatchdogId: (id: string) => Promise<{ data?: MovieData }> } } };
    return await w.electron.movies.getByWatchdogId('11083261');
  });
  expect(result.data).toBeDefined();
  expect(result.data!.popularity).toBeNull();
});

test.afterAll(async () => {

  await app.evaluate(async ({ app }) => {
    const appWithTestHooks = app as typeof app & {
      testHooks?: {
        db: { closeDatabase: () => void }
      };
    };

    if (!appWithTestHooks.testHooks) {
      throw new Error('Test hooks not available');
    }

    appWithTestHooks.testHooks.db.closeDatabase();
  });

  await app.close();
});

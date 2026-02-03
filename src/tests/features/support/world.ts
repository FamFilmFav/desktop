import { World, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
import { _electron as electron, ElectronApplication } from 'playwright';
import { HomePage } from './pages/home.page';

export class CustomWorld extends World {
  app!: ElectronApplication;
  homePage!: HomePage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async launchApp(): Promise<void> {
    const debugArgs = process.env.PWDEBUG ? ['--inspect-brk=9229'] : [];
    this.app = await electron.launch({ args: ['.', ...debugArgs] });
    
    this.app.on('console', (msg) => {
      console.log('[app]', msg.text());
    });

    this.homePage = new HomePage(this.app);
  }

  async initMockDatabase(): Promise<void> {
    await this.app.evaluate(async ({ app }) => {
      const appWithTestHooks = app as typeof app & {
        testHooks?: { db: { initMockDatabase: () => void } };
      };

      if (!appWithTestHooks.testHooks) {
        throw new Error('Test hooks not available');
      }

      appWithTestHooks.testHooks.db.initMockDatabase();
    });
  }

  async closeDatabase(): Promise<void> {
    await this.app.evaluate(async ({ app }) => {
      const appWithTestHooks = app as typeof app & {
        testHooks?: { db: { closeDatabase: () => void } };
      };

      if (!appWithTestHooks.testHooks) {
        throw new Error('Test hooks not available');
      }

      appWithTestHooks.testHooks.db.closeDatabase();
    });
  }

  async loadStubTmdbData(dataSource: string): Promise<void> {

    console.info('Loading stub TMDB data from:', dataSource);
    
    await this.app.evaluate(async ({ app }, dataSource: string) => {
      const appWithTestHooks = app as typeof app & {
        testHooks?: { 
          data: { loadStubTmdbData(dataSource: string): Promise<void> }
        };
      };

      if (!appWithTestHooks.testHooks) {
        throw new Error('Test hooks not available');
      }

      await appWithTestHooks.testHooks.data.loadStubTmdbData(dataSource);
    }, dataSource);
  }

  async loadStubWatchmodeData(dataSource: string): Promise<void> {
    
    console.info('Loading stub Watchmode data from:', dataSource);

    await this.app.evaluate(async ({ app }, dataSource: string) => {
      const appWithTestHooks = app as typeof app & {
        testHooks?: { 
          data: { loadStubWatchmodeData(dataSource: string): Promise<void> }
        };
      };

      if (!appWithTestHooks.testHooks) {
        throw new Error('Test hooks not available');
      }

      await appWithTestHooks.testHooks.data.loadStubWatchmodeData(dataSource);
    }, dataSource);
  }

  async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }
}

setWorldConstructor(CustomWorld);

import Store from 'electron-store';

const DEFAULT_SETTINGS: Record<string, unknown> = {
  webPort: 3000,
  watchmodeApiKey: '',
  tmdbApiKey: ''
};

type StoreLike = {
  has: (key: string) => boolean;
  get: (key: string, defaultValue?: unknown) => unknown;
  set: (key: string, value: unknown) => void;
};

export default class SettingsManager {
  private store: StoreLike;

  constructor() {
    const s = new Store<{ settings: Record<string, unknown> }>();
    this.store = s as unknown as StoreLike;
    if (!this.store.has('settings')) {
      this.store.set('settings', {});
    }
  }

  initialize(): void {
    // electron-store automatically loads persisted data
  }

  get(key: string): unknown {
    const settings = this.store.get('settings', {}) as Record<string, unknown>;
    if (key in settings) {
      return settings[key];
    }
    return DEFAULT_SETTINGS[key];
  }

  set(key: string, value: unknown): void {
    const settings = this.store.get('settings', {}) as Record<string, unknown>;
    settings[key] = value;
    this.store.set('settings', settings);
  }

  getAll(): Record<string, unknown> {
    return this.store.get('settings', {}) as Record<string, unknown>;
  }

  setAll(settings: Record<string, unknown>): void {
    const currentSettings = this.store.get('settings', {}) as Record<string, unknown>;
    const merged = { ...currentSettings, ...settings };
    this.store.set('settings', merged);
  }

  clear(): void {
    this.store.set('settings', {});
  }
}

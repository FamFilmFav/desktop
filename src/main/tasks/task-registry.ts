import type BackgroundTask from './BackgroundTask';
import ImportWatchmodeTask from './ImportWatchmodeTask';
import ImportTmdbTask from './ImportTmdbTask';

export type TaskRegistryType = 'import-watchmode' | 'import-tmdb';

export const TASK_REGISTRY: Record<TaskRegistryType, new () => BackgroundTask> = {
  'import-watchmode': ImportWatchmodeTask,
  'import-tmdb': ImportTmdbTask
};

export default TASK_REGISTRY;

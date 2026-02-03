/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import type BackgroundTask from './BackgroundTask';
import ImportWatchmodeTask from './ImportWatchmodeTask';
import ImportTmdbTask from './ImportTmdbTask';

export type TaskRegistryType = 'import-watchmode' | 'import-tmdb';

export const TASK_REGISTRY: Record<TaskRegistryType, new () => BackgroundTask> = {
  'import-watchmode': ImportWatchmodeTask,
  'import-tmdb': ImportTmdbTask
};

export default TASK_REGISTRY;

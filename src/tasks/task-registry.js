const ImportWatchmodeTask = require('./ImportWatchmodeTask');
const ImportTmdbTask = require('./ImportTmdbTask');

/**
 * Registry of task type -> Task class.
 * Keys are used when enqueueing (e.g. 'import-watchmode').
 * Add new tasks here and in your enqueue UI.
 */
const TASK_REGISTRY = {
  'import-watchmode': ImportWatchmodeTask,
  'import-tmdb': ImportTmdbTask
};

module.exports = TASK_REGISTRY;

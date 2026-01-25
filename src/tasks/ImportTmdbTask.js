const BackgroundTask = require('./BackgroundTask');

const STEP_DURATION_MS = 20 * 1000;
const STEPS = [
  'Downloading data...',
  'Processing records...',
  'Writing to database...'
];

class ImportTmdbTask extends BackgroundTask {
  static get label() {
    return 'Import TMDB Database';
  }

  async runTask(args, context) {
    const totalSteps = STEPS.length;
    for (let i = 0; i < totalSteps; i++) {
      if (context.isCancelled()) {
        throw new Error('Task cancelled');
      }
      context.reportProgress({ current: i + 1, max: totalSteps, description: STEPS[i] });
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));
    }
    context.reportProgress({ current: totalSteps, max: totalSteps, description: 'Complete' });
  }
}

module.exports = ImportTmdbTask;

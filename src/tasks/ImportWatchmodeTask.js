const BackgroundTask = require('./BackgroundTask');

const STEP_DURATION_MS = 20 * 1000;
const STEPS = [
  'Downloading data...',
  'Processing records...',
  'Writing to database...'
];

class ImportWatchmodeTask extends BackgroundTask {
  static get label() {
    return 'Import Watchmode Database';
  }

  async runTask(args, context) {
    const totalSteps = STEPS.length;
    for (let i = 0; i < totalSteps; i++) {
      context.reportProgress({ currentStep: i, totalSteps, stepLabel: STEPS[i] });
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));
    }
    context.reportProgress({ currentStep: totalSteps, totalSteps, stepLabel: 'Complete' });
  }
}

module.exports = ImportWatchmodeTask;

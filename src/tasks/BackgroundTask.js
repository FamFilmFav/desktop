/**
 * Interface for background tasks run by the background-task-manager.
 * Implement runTask(args, context). Use context.reportProgress() to report
 * generic status (currentStep, totalSteps, stepLabel) to the manager.
 *
 * @typedef {Object} TaskContext
 * @property {function} reportProgress - Call with { currentStep, totalSteps, stepLabel }
 *
 * @typedef {Object} ProgressReport
 * @property {number} currentStep - 0-based step index
 * @property {number} totalSteps - Total number of steps
 * @property {string} [stepLabel] - Human-readable label for current step
 */
class BackgroundTask {
  /**
   * Display name for the task (used in UI). Override in subclasses.
   * @returns {string}
   */
  static get label() {
    return 'Unnamed Task';
  }

  /**
   * Run the task. Subclasses must implement.
   * @param {any} args - Arguments passed when the task was enqueued
   * @param {TaskContext} context - { reportProgress({ currentStep, totalSteps, stepLabel }) }
   * @returns {Promise<void>}
   */
  async runTask(args, context) {
    throw new Error('Subclasses must implement runTask(args, context)');
  }
}

module.exports = BackgroundTask;

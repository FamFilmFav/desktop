/**
 * Interface for background tasks run by the background-task-manager.
 * Implement runTask(args, context). Use context.reportProgress() to report
 * generic status (current, max, description) to the manager.
 *
 * @typedef {Object} TaskContext
 * @property {function} reportProgress - Call with { current, max, description }
 *
 * @typedef {Object} ProgressReport
 * @property {number} [current] - Current progress value (if undefined, indeterminate)
 * @property {number} [max] - Maximum progress value
 * @property {string} [description] - Human-readable description of current progress
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

const TASK_REGISTRY = require('./tasks/task-registry');

let taskIdCounter = 0;
let queue = [];
let active = null;
let notifyFn = null;

function generateId() {
  return `task-${++taskIdCounter}-${Date.now()}`;
}

function emitUpdate() {
  if (typeof notifyFn === 'function') {
    notifyFn({ active: active ? payload(active) : null, queue: queue.map(payload) });
  }
}

function payload(entry) {
  if (!entry) return null;
  const TaskClass = TASK_REGISTRY[entry.type];
  const label = TaskClass ? TaskClass.label : entry.type;
  return {
    id: entry.id,
    type: entry.type,
    label,
    status: entry.status,
    currentStep: entry.currentStep ?? 0,
    totalSteps: entry.totalSteps ?? 0,
    stepLabel: entry.stepLabel ?? ''
  };
}

async function processQueue() {
  if (active || queue.length === 0) return;
  const entry = queue.shift();
  active = {
    ...entry,
    status: 'running',
    currentStep: 0,
    totalSteps: 0,
    stepLabel: ''
  };
  emitUpdate();

  const TaskClass = TASK_REGISTRY[entry.type];
  const task = new TaskClass();
  const context = {
    reportProgress: ({ currentStep, totalSteps, stepLabel }) => {
      if (!active) return;
      active.currentStep = currentStep;
      active.totalSteps = totalSteps;
      active.stepLabel = stepLabel ?? '';
      emitUpdate();
    }
  };

  try {
    await task.runTask(entry.args ?? {}, context);
    active.status = 'completed';
  } catch (err) {
    active.status = 'failed';
    active.stepLabel = err.message || 'Failed';
    console.error('Background task failed:', err);
  }
  emitUpdate();

  active = null;
  emitUpdate();
  processQueue();
}

/**
 * Register a callback to notify renderer of state changes.
 * Called with { active, queue } (generic status only).
 * @param {function} fn
 */
function setNotifyFn(fn) {
  notifyFn = fn;
}

/**
 * Enqueue a background task by type. Arguments are passed to the task's runTask().
 * @param {string} type - Registry key (e.g. 'import-watchmode', 'import-tmdb')
 * @param {any} [args] - Arguments passed to runTask(args, context)
 * @returns {{ success: boolean, taskId?: string, error?: string }}
 */
function enqueue(type, args = {}) {
  const TaskClass = TASK_REGISTRY[type];
  if (!TaskClass) {
    return { success: false, error: `Unknown task type: ${type}` };
  }
  const entry = {
    id: generateId(),
    type,
    args,
    status: 'queued',
    currentStep: 0,
    totalSteps: 0,
    stepLabel: ''
  };
  queue.push(entry);
  emitUpdate();
  processQueue();
  return { success: true, taskId: entry.id };
}

/**
 * Get current state for renderer (active task + queued list, generic status only).
 * @returns {{ active: object | null, queue: object[] }}
 */
function getState() {
  return {
    active: active ? payload(active) : null,
    queue: queue.map(payload)
  };
}

module.exports = {
  setNotifyFn,
  enqueue,
  getState
};

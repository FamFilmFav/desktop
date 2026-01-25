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
    current: entry.current,
    max: entry.max,
    description: entry.description ?? ''
  };
}

async function processQueue() {
  if (active || queue.length === 0) return;
  const entry = queue.shift();
  const cancelled = { value: false };
  active = {
    ...entry,
    status: 'running',
    current: undefined,
    max: undefined,
    description: '',
    cancelled
  };
  emitUpdate();

  const TaskClass = TASK_REGISTRY[entry.type];
  const task = new TaskClass();
  const abortController = new AbortController();
  const context = {
    reportProgress: ({ current, max, description }) => {
      if (!active || active.cancelled.value) return;
      active.current = current;
      active.max = max;
      active.description = description ?? '';
      emitUpdate();
    },
    isCancelled: () => active?.cancelled?.value || false,
    abortSignal: abortController.signal
  };

  try {
    await task.runTask(entry.args ?? {}, context);
    if (active && !active.cancelled.value) {
      active.status = 'completed';
    }
  } catch (err) {
    if (active && !active.cancelled.value) {
      active.status = 'failed';
      active.description = err.message || 'Failed';
    }
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
    current: undefined,
    max: undefined,
    description: ''
  };
  queue.push(entry);
  emitUpdate();
  processQueue();
  return { success: true, taskId: entry.id };
}

/**
 * Cancel the currently active task.
 * @returns {{ success: boolean, error?: string }}
 */
function cancelActive() {
  if (!active) {
    return { success: false, error: 'No active task to cancel' };
  }
  active.status = 'cancelled';
  active.cancelled.value = true;
  emitUpdate();
  // Do not set active = null here; let processQueue handle it after the task throws
  return { success: true };
}

/**
 * Remove a queued task by ID.
 * @param {string} taskId
 * @returns {{ success: boolean, error?: string }}
 */
function removeQueued(taskId) {
  const index = queue.findIndex(t => t.id === taskId);
  if (index === -1) {
    return { success: false, error: `Queued task not found: ${taskId}` };
  }
  queue.splice(index, 1);
  emitUpdate();
  return { success: true };
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
  getState,
  cancelActive,
  removeQueued
};

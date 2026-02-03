import { TASK_REGISTRY, type TaskRegistryType } from './tasks/task-registry';
import type BackgroundTask from './tasks/BackgroundTask';
import type { ProgressReport, TaskContext } from './tasks/BackgroundTask';

interface QueueEntry {
  id: string;
  type: TaskRegistryType;
  args: Record<string, unknown>;
  status: string;
  current?: number;
  max?: number;
  description: string;
}

interface ActiveEntry extends QueueEntry {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  cancelled: { value: boolean };
}

interface TaskPayload {
  id: string;
  type: string;
  label: string;
  status: string;
  current?: number;
  max?: number;
  description: string;
}

interface StatePayload {
  active: TaskPayload | null;
  queue: TaskPayload[];
}

let taskIdCounter = 0;
const queue: QueueEntry[] = [];
let active: ActiveEntry | null = null;
let notifyFn: ((state: StatePayload) => void) | null = null;

function generateId(): string {
  return `task-${++taskIdCounter}-${Date.now()}`;
}

function payload(entry: ActiveEntry | QueueEntry | null): TaskPayload | null {
  if (!entry) return null;
  const TaskClass = TASK_REGISTRY[entry.type as TaskRegistryType] as (new () => BackgroundTask) | undefined;
  const label = TaskClass ? (TaskClass as unknown as typeof BackgroundTask).label : entry.type;
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

function emitUpdate(): void {
  if (typeof notifyFn === 'function') {
    notifyFn({
      active: active ? payload(active) : null,
      queue: queue.map((e) => payload(e) as TaskPayload)
    });
  }
}

async function processQueue(): Promise<void> {
  if (active || queue.length === 0) return;
  const entry = queue.shift()!;
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
  const context: TaskContext = {
    reportProgress: ({ current, max, description }: ProgressReport) => {
      if (!active || active.cancelled.value) return;
      active.current = current;
      active.max = max;
      active.description = description ?? '';
      emitUpdate();
    },
    isCancelled: () => active?.cancelled?.value ?? false,
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
      active.description = err instanceof Error ? err.message : 'Failed';
    }
  }
  emitUpdate();

  active = null;
  emitUpdate();
  void processQueue();
}

export function setNotifyFn(fn: (state: StatePayload) => void): void {
  notifyFn = fn;
}

export function enqueue(
  type: TaskRegistryType,
  args: Record<string, unknown> = {}
): { success: boolean; taskId?: string; error?: string } {
  const TaskClass = TASK_REGISTRY[type];
  if (!TaskClass) {
    return { success: false, error: `Unknown task type: ${type}` };
  }
  const entry: QueueEntry = {
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
  void processQueue();
  return { success: true, taskId: entry.id };
}

export function cancelActive(): { success: boolean; error?: string } {
  if (!active) {
    return { success: false, error: 'No active task to cancel' };
  }
  active.status = 'cancelled';
  active.cancelled.value = true;
  emitUpdate();
  return { success: true };
}

export function removeQueued(taskId: string): { success: boolean; error?: string } {
  const index = queue.findIndex((t) => t.id === taskId);
  if (index === -1) {
    return { success: false, error: `Queued task not found: ${taskId}` };
  }
  queue.splice(index, 1);
  emitUpdate();
  return { success: true };
}

export function getState(): StatePayload {
  return {
    active: active ? payload(active) : null,
    queue: queue.map((e) => payload(e) as TaskPayload)
  };
}

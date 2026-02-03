export interface ProgressReport {
  current?: number;
  max?: number;
  description?: string;
}

export interface TaskContext {
  reportProgress: (report: ProgressReport) => void;
  isCancelled: () => boolean;
  abortSignal: AbortSignal;
}

export default abstract class BackgroundTask {
  static get label(): string {
    return 'Unnamed Task';
  }

  abstract runTask(args: Record<string, unknown>, context: TaskContext): Promise<void>;
}

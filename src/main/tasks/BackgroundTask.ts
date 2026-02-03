/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

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

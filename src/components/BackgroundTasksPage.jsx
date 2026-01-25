import React, { useState, useEffect } from 'react';
import '../styles/BackgroundTasksPage.css';

export default function BackgroundTasksPage() {
  const [active, setActive] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const state = await window.electron.getBackgroundTasks();
        setActive(state.active);
        setQueue(state.queue || []);
      } catch (err) {
        console.error('Failed to load background tasks:', err);
      }
    };
    load();

    const unsubscribe = window.electron.onBackgroundTaskUpdate?.((state) => {
      setActive(state.active);
      setQueue(state.queue || []);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const progressPercent = active && active.current !== undefined && active.max
    ? Math.min(100, Math.round((active.current / active.max) * 100))
    : null; // null for indeterminate
  const isIndeterminate = progressPercent === null;


  const cancelActiveTask = async () => {
    try {
      const result = await window.electron.cancelActiveBackgroundTask?.();
      if (!result?.success) {
        console.error('Failed to cancel active task:', result?.error);
      }
    } catch (err) {
      console.error('Error cancelling task:', err);
    }
  };

  const removeQueuedTask = async (taskId) => {
    try {
      const result = await window.electron.removeQueuedBackgroundTask?.(taskId);
      if (!result?.success) {
        console.error('Failed to remove queued task:', result?.error);
      }
    } catch (err) {
      console.error('Error removing task:', err);
    }
  };

  return (
    <div className="background-tasks-page">
      <div className="background-tasks-container">
        <h1 className="background-tasks-title">Background Tasks</h1>

        <section className="tasks-section">
          <h2 className="tasks-section-title">Active Task</h2>
          {active ? (
            <div className="active-task">
              <div className="active-task-label">{active.label}</div>
              <div className="active-task-step">
                {active.description || 'Working...'}
              </div>
              <div className="progress-bar-wrap">
                <div
                  className={`progress-bar-fill ${isIndeterminate ? 'indeterminate' : ''}`}
                  style={isIndeterminate ? {} : { width: `${progressPercent}%` }}
                />
              </div>
              <div className="progress-text">
                {isIndeterminate 
                  ? 'In progress...' 
                  : `${progressPercent}% complete`
                }
              </div>
              <button
                type="button"
                className="btn-cancel-task"
                onClick={cancelActiveTask}
              >
                Cancel Task
              </button>
            </div>
          ) : (
            <div className="no-active-task">No task running</div>
          )}
        </section>

        <section className="tasks-section">
          <h2 className="tasks-section-title">Queued Tasks</h2>
          {queue.length > 0 ? (
            <ul className="queued-list">
              {queue.map((t) => (
                <li key={t.id} className="queued-item">
                  <span className="queued-item-label">{t.label}</span>
                  <button
                    type="button"
                    className="btn-remove-task"
                    onClick={() => removeQueuedTask(t.id)}
                    aria-label={`Remove ${t.label}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-queued-tasks">No tasks queued</div>
          )}
        </section>
      </div>
    </div>
  );
}

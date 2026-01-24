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

  const totalSteps = active?.totalSteps || 1;
  const displayTotal = active?.totalSteps || 3;
  const progressPercent = active
    ? Math.min(100, Math.round(((active.currentStep || 0) / totalSteps) * 100))
    : 0;
  const stepDisplay =
    active?.status === 'completed'
      ? 'Complete'
      : active
        ? `Step ${Math.min((active.currentStep || 0) + 1, displayTotal)} of ${displayTotal}`
        : '';

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
                {active.stepLabel || `Step ${(active.currentStep || 0) + 1} of ${active.totalSteps || 3}`}
              </div>
              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="progress-text">{stepDisplay}</div>
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
                  {t.label}
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

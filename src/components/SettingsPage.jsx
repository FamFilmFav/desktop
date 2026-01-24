import React, { useState, useEffect } from 'react';
import '../styles/SettingsPage.css';

export default function SettingsPage() {
  const [webPort, setWebPort] = useState('3000');
  const [watchmodeApiKey, setWatchmodeApiKey] = useState('');
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');
  const [backgroundTaskMessage, setBackgroundTaskMessage] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await window.electron.loadSettings();
        if (result.success && result.data) {
          if (result.data.webPort) {
            setWebPort(result.data.webPort.toString());
          }
          if (result.data.watchmodeApiKey != null) {
            setWatchmodeApiKey(result.data.watchmodeApiKey);
          }
          if (result.data.tmdbApiKey != null) {
            setTmdbApiKey(result.data.tmdbApiKey);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const state = await window.electron.getBackgroundTasks?.();
        setActiveTask(state?.active ?? null);
      } catch {
        setActiveTask(null);
      }
    };
    load();
    const unsubscribe = window.electron.onBackgroundTaskUpdate?.((state) => {
      setActiveTask(state?.active ?? null);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const saveSettings = async () => {
    const settings = {
      webPort: parseInt(webPort),
      watchmodeApiKey,
      tmdbApiKey
    };

    try {
      const result = await window.electron.saveSettings(settings);
      if (result.success) {
        showMessage('Settings saved successfully!', 'success');
        // Clear message after 3 seconds
        setTimeout(() => {
          setStatusMessage('');
          setStatusType('');
        }, 3000);
      }
    } catch (error) {
      showMessage('Error saving settings: ' + error.message, 'error');
      // Clear error message after 5 seconds
      setTimeout(() => {
        setStatusMessage('');
        setStatusType('');
      }, 5000);
    }
  };

  const showMessage = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const enqueueBackgroundTask = async (taskType) => {
    try {
      const result = await window.electron.enqueueBackgroundTask?.(taskType);
      if (result?.success) {
        setBackgroundTaskMessage('Task queued. See System → Background Tasks.');
        setTimeout(() => setBackgroundTaskMessage(''), 4000);
      } else {
        setBackgroundTaskMessage(result?.error || 'Failed to queue task.');
        setTimeout(() => setBackgroundTaskMessage(''), 5000);
      }
    } catch (err) {
      setBackgroundTaskMessage('Error: ' + (err.message || 'Could not queue task'));
      setTimeout(() => setBackgroundTaskMessage(''), 5000);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    const loadSettings = async () => {
      try {
        const result = await window.electron.loadSettings();
        if (result.success && result.data) {
          if (result.data.webPort) {
            setWebPort(result.data.webPort.toString());
          }
          if (result.data.watchmodeApiKey != null) {
            setWatchmodeApiKey(result.data.watchmodeApiKey);
          }
          if (result.data.tmdbApiKey != null) {
            setTmdbApiKey(result.data.tmdbApiKey);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
    setStatusMessage('');
    setStatusType('');
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">Settings</h1>

        <div className="setting-group">
          <label htmlFor="webPort">Web Server Port</label>
          <input
            type="number"
            id="webPort"
            placeholder="3000"
            value={webPort}
            onChange={(e) => setWebPort(e.target.value)}
          />
        </div>

        <div className="setting-group">
          <label htmlFor="watchmodeApiKey">Watchmode API Key</label>
          <input
            type="password"
            id="watchmodeApiKey"
            placeholder=""
            value={watchmodeApiKey}
            onChange={(e) => setWatchmodeApiKey(e.target.value)}
          />
        </div>

        <div className="setting-group">
          <label htmlFor="tmdbApiKey">TMDB API Key</label>
          <input
            type="password"
            id="tmdbApiKey"
            placeholder=""
            value={tmdbApiKey}
            onChange={(e) => setTmdbApiKey(e.target.value)}
          />
        </div>

        <div className="setting-group">
          <label>Background Tasks</label>
          <div className="background-task-buttons">
            <button
              type="button"
              className="btn-background-task"
              onClick={() => enqueueBackgroundTask('import-watchmode')}
              disabled={activeTask?.type === 'import-watchmode'}
            >
              Import Watchmode Database
            </button>
            <button
              type="button"
              className="btn-background-task"
              onClick={() => enqueueBackgroundTask('import-tmdb')}
              disabled={activeTask?.type === 'import-tmdb'}
            >
              Import TMDB Database
            </button>
          </div>
          {backgroundTaskMessage && (
            <div className="background-task-message">{backgroundTaskMessage}</div>
          )}
        </div>

        <div className="button-group">
          <button className="btn-save" onClick={saveSettings}>
            Save Settings
          </button>
          <button className="btn-cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>

        {statusMessage && (
          <div className={`status-message ${statusType}`}>{statusMessage}</div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import '../styles/SettingsPage.css';

export default function SettingsPage() {
  const [webPort, setWebPort] = useState('3000');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await window.electron.loadSettings();
        if (result.success && result.data) {
          if (result.data.webPort) {
            setWebPort(result.data.webPort.toString());
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async () => {
    const settings = {
      webPort: parseInt(webPort),
    };

    try {
      const result = await window.electron.saveSettings(settings);
      if (result.success) {
        showMessage('Settings saved successfully!', 'success');
        setTimeout(() => window.close(), 1500);
      }
    } catch (error) {
      showMessage('Error saving settings: ' + error.message, 'error');
    }
  };

  const showMessage = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const handleCancel = () => {
    window.close();
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

import React, { useState, useEffect } from 'react';
import '../styles/HomePage.css';

export default function HomePage() {
  const [appVersion, setAppVersion] = useState('Loading...');
  const [accessInfo, setAccessInfo] = useState('Loading...');
  const [serverStatus, setServerStatus] = useState(null);
  const [webAccessUrl, setWebAccessUrl] = useState('http://localhost:3000');
  const isElectron = typeof window.electron !== 'undefined';

  const openSettings = async () => {
    if (isElectron) {
      await window.electron.openSettings();
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      if (isElectron) {
        // Desktop app environment
        try {
          const port = await window.electron.getServerPort();
          const url = `http://localhost:${port}`;
          setWebAccessUrl(url);
          setAccessInfo(`This UI is also accessible at: ${url}`);
        } catch (error) {
          console.error('Error loading server port:', error);
        }

        try {
          const version = await window.electron.getAppVersion();
          setAppVersion(version);
        } catch (error) {
          console.error('Error loading app version:', error);
        }
      } else {
        // Web browser environment
        setAccessInfo('Web Version - Access from any device on your network');
        setWebAccessUrl(window.location.origin);

        try {
          const versionResponse = await fetch('/api/version');
          const versionData = await versionResponse.json();
          setAppVersion(versionData.version);
        } catch (error) {
          console.error('Error loading version:', error);
          setAppVersion('Error loading version');
        }

        try {
          const healthResponse = await fetch('/api/health');
          if (healthResponse.ok) {
            setServerStatus('online');
          }
        } catch (error) {
          console.error('Server error:', error);
          setServerStatus('offline');
        }
      }
    };

    initializeApp();
  }, []);

  return (
    <div className="home-page">
      <header className="app-header">
        <h1>FamFilmFav</h1>
        <div id="headerActions">
          {serverStatus && (
            <span
              id="serverStatus"
              className={`server-status ${serverStatus}`}
              style={{
                marginRight: '10px',
                fontSize: '12px',
                color: serverStatus === 'online' ? '#155724' : '#721c24',
              }}
            >
              {serverStatus === 'online' ? '✓ Server Online' : '✗ Server Offline'}
            </span>
          )}
          {isElectron && (
            <button id="settingsBtn" onClick={openSettings}>
              Settings
            </button>
          )}
        </div>
      </header>

      <div className="app-content">
        <div className="welcome-message">
          <h2>Welcome to FamFilmFav</h2>
          <p>Your family film favorites manager</p>

          <div className="info-box">
            <p>
              <strong>App Version:</strong> <span id="appVersion">{appVersion}</span>
            </p>
            <p>
              <strong>Access:</strong> <span id="accessInfo">{accessInfo}</span>
            </p>
          </div>

          <div style={{ marginTop: '30px', textAlign: 'left' }}>
            <h3>Getting Started</h3>
            <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '10px' }}>
              {isElectron && <li>Click "Settings" to configure the app</li>}
              <li>
                Access the web version at <span className="access-url">{webAccessUrl}</span>
              </li>
              {isElectron && <li>Right-click the tray icon for menu options</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import '../styles/HomePage.css';

export default function HomePage(): React.ReactElement {
  const [version, setVersion] = useState<string>('');
  const [port, setPort] = useState<number | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const checkElectron = typeof window !== 'undefined' && Boolean((window as Window & { electron?: unknown }).electron);
    setIsElectron(checkElectron);

    async function load(): Promise<void> {
      try {
        const v = await window.electron?.getAppVersion?.();
        if (v != null) setVersion(String(v));
      } catch {
        setVersion('unknown');
      }
      try {
        const p = await window.electron?.getServerPort?.();
        if (p != null) setPort(p);
      } catch {
        setPort(null);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (port == null) return;
    const check = async (): Promise<void> => {
      try {
        const res = await fetch(`http://localhost:${port}/api/health`, { method: 'GET' });
        setServerOnline(res.ok);
      } catch {
        setServerOnline(false);
      }
    };
    void check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [port]);

  const openSettings = (): void => {
    void window.electron?.openSettings?.();
  };

  return (
    <div className="home-page">
      <div className="app-header">
        <h1>Family Watch Night</h1>
        <div id="headerActions">
          {version && <span className="version">v{version}</span>}
          {port != null && (
            <span className={`server-status ${serverOnline === true ? 'online' : serverOnline === false ? 'offline' : ''}`}>
              {serverOnline === true ? 'Server online' : serverOnline === false ? 'Server offline' : 'Checking...'}
            </span>
          )}
          {isElectron && (
            <button type="button" onClick={openSettings} className="btn-settings">
              Settings
            </button>
          )}
        </div>
      </div>
      <div className="app-content">
        <div className="welcome-message">
          <h2>Welcome</h2>
          <p>Family Film Favorites – manage your movie collection.</p>
          {port != null && (
            <h3>Access URL</h3>
          )}
          {port != null && (
            <div className="info-box">
              <code className="access-url">http://localhost:{port}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

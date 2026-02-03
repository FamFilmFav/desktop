import React, { useState, useEffect } from 'react';
import '../styles/Layout.css';
import HomePage from './HomePage';
import SettingsPage from './SettingsPage';
import BackgroundTasksPage from './BackgroundTasksPage';

interface TaskPayload {
  id: string;
  type: string;
  label: string;
  status: string;
  current?: number;
  max?: number;
  description?: string;
}

export default function Layout(): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskPayload | null>(null);
  const [queue, setQueue] = useState<TaskPayload[]>([]);

  const toggleMenu = (): void => setMenuOpen(!menuOpen);
  const closeMenu = (): void => setMenuOpen(false);
  const navigateTo = (page: string): void => {
    setCurrentPage(page);
    closeMenu();
  };

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const state = await window.electron?.getBackgroundTasks?.();
        setActiveTask((state?.active as TaskPayload) ?? null);
        setQueue((state?.queue as TaskPayload[]) ?? []);
      } catch {
        setActiveTask(null);
        setQueue([]);
      }
    };
    void load();
    const unsubscribe = window.electron?.onBackgroundTaskUpdate?.((state) => {
      setActiveTask(state?.active as TaskPayload ?? null);
      setQueue(state?.queue as TaskPayload[] ?? []);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const renderPage = (): React.ReactElement => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'settings':
        return <SettingsPage />;
      case 'background-tasks':
        return <BackgroundTasksPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="app-layout">
      <button className="hamburger-button" onClick={toggleMenu} aria-label="Toggle menu">
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
      </button>
      {menuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}
      <div className={`side-menu ${menuOpen ? 'open' : ''}`}>
        <div className="menu-content">
          <div className="menu-nav-section">
            <nav className="menu-nav">
              <button
                className={`menu-item ${currentPage === 'home' ? 'active' : ''}`}
                onClick={() => navigateTo('home')}
              >
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Home</span>
              </button>
            </nav>
            <div className={`menu-system ${systemExpanded ? 'expanded' : 'collapsed'}`}>
              <button
                type="button"
                className="menu-system-toggle"
                onClick={() => setSystemExpanded(!systemExpanded)}
                aria-expanded={systemExpanded}
                aria-controls="menu-system-items"
              >
                <span className="menu-system-chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
                <span className="menu-system-label">System</span>
              </button>
              <div id="menu-system-items" className="menu-system-items">
                <button
                  className={`menu-item ${currentPage === 'background-tasks' ? 'active' : ''}`}
                  onClick={() => navigateTo('background-tasks')}
                >
                  <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2v5l6 5v2l-6 5v5h12v-5l-6-5v-2l6-5V2H6z"/>
                  </svg>
                  <span>Background Tasks</span>
                  {(activeTask || queue.length > 0) && (
                    <span className="menu-badge">{(activeTask ? 1 : 0) + queue.length}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="menu-footer">
            <button
              className={`menu-item ${currentPage === 'settings' ? 'active' : ''}`}
              onClick={() => navigateTo('settings')}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
      <div className="main-content">
        {renderPage()}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import MetricsOverview from './MetricsOverview';
import HighLoadPaths from './HighLoadPaths';
import ActivityChart from './ActivityChart';
import WindowStats from './WindowStats';
import Settings from './Settings';

function Dashboard({ workloadData }) {
  const [selectedView, setSelectedView] = useState('overview');

  if (!workloadData) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const { current_window, high_load_paths, recent_history, total_paths_monitored, monitoring_active } = workloadData;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Real-time I/O Activity</h2>
        <div className="dashboard-stats">
          <div className="stat-badge">
            <span className="stat-label">Paths Monitored</span>
            <span className="stat-value">{total_paths_monitored}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Hotspots</span>
            <span className="stat-value highlight">{high_load_paths.length}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Status</span>
            <span className={`stat-value ${monitoring_active ? 'active' : 'inactive'}`}>
              {monitoring_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${selectedView === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedView('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${selectedView === 'activity' ? 'active' : ''}`}
          onClick={() => setSelectedView('activity')}
        >
          Activity Chart
        </button>
        <button
          className={`tab ${selectedView === 'highload' ? 'active' : ''}`}
          onClick={() => setSelectedView('highload')}
        >
          High-Load Paths
        </button>
        <button
          className={`tab ${selectedView === 'windows' ? 'active' : ''}`}
          onClick={() => setSelectedView('windows')}
        >
          Time Windows
        </button>
        <button
          className={`tab ${selectedView === 'settings' ? 'active' : ''}`}
          onClick={() => setSelectedView('settings')}
        >
          Settings
        </button>
      </div>

      <div className="dashboard-content">
        {selectedView === 'overview' && (
          <MetricsOverview currentWindow={current_window} highLoadPaths={high_load_paths} />
        )}
        {selectedView === 'activity' && (
          <ActivityChart recentHistory={recent_history} currentWindow={current_window} />
        )}
        {selectedView === 'highload' && (
          <HighLoadPaths highLoadPaths={high_load_paths} />
        )}
        {selectedView === 'windows' && (
          <WindowStats recentHistory={recent_history} currentWindow={current_window} />
        )}
        {selectedView === 'settings' && (
          <Settings />
        )}
      </div>
    </div>
  );
}

export default Dashboard;

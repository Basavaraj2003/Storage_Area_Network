import React from 'react';
import './Header.css';
import { useAuth } from '../contexts/AuthContext';

function Header({ isConnected }) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">
            <span className="header-icon">💾</span>
            SAN I/O Workload Monitor
          </h1>
          <p className="header-subtitle">Real-time Storage Area Network I/O Activity Monitoring</p>
        </div>
        <div className="header-right">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {isAuthenticated && user && (
            <div className="user-info">
              <span className="username">Welcome, {user.username}</span>
              <button className="logout-btn" onClick={logout}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import { connectWebSocket, disconnectWebSocket } from './services/websocket';
import Login from './pages/Login';
import { useAuth } from './contexts/AuthContext.js';

function App() {
  const [workloadData, setWorkloadData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const handleMessage = (data) => {
      setWorkloadData(data);
      setIsConnected(true);
      setError(null);
    };

    const handleError = (err) => {
      setError(err.message || 'Connection error');
      setIsConnected(false);
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    connectWebSocket(handleMessage, handleError, handleClose);

    // Also fetch initial data via REST API
    fetch('/api/workload')
      .then(res => res.json())
      .then(data => {
        setWorkloadData(data);
        setIsConnected(true);
      })
      .catch(err => {
        setError('Failed to fetch initial data: ' + err.message);
      });

    return () => {
      disconnectWebSocket();
    };
  }, []);

  const { isAuthenticated, loading: authLoading } = useAuth();

  return (
    <div className="App">
      <Header isConnected={isConnected} />
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      <main className="main-content">
        {/* Show login page when auth not present, otherwise show app */}
        {!authLoading && !isAuthenticated ? (
          <Login />
        ) : (
          (workloadData ? (
            <Dashboard workloadData={workloadData} />
          ) : (
            <div className="loading">
              <div className="spinner"></div>
              <p>Connecting to SAN I/O Monitor...</p>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

export default App;

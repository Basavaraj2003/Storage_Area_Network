import React, { useState } from 'react';
import './MetricsOverview.css';
import EventLogs from './EventLogs';

function MetricsOverview({ currentWindow, highLoadPaths }) {
  const [selectedOperation, setSelectedOperation] = useState(null);


  const handleCardClick = (operationType) => {
    setSelectedOperation(operationType);
  };

  return (
    <div className="metrics-overview">
      <div className="metrics-grid">
        <div 
          className="metric-card read clickable"
          onClick={() => handleCardClick('read')}
        >
          <div className="metric-icon">📖</div>
          <div className="metric-content">
            <div className="metric-label">Read Operations</div>
            <div className="metric-description">Click to view details</div>
          </div>
        </div>

        <div 
          className="metric-card write clickable"
          onClick={() => handleCardClick('write')}
        >
          <div className="metric-icon">✍️</div>
          <div className="metric-content">
            <div className="metric-label">Write Operations</div>
            <div className="metric-description">Click to view details</div>
          </div>
        </div>
        
        <div 
          className="metric-card create clickable"
          onClick={() => handleCardClick('create')}
        >
          <div className="metric-icon">🆕</div>
          <div className="metric-content">
            <div className="metric-label">Create Operations</div>
            <div className="metric-description">Click to view details</div>
          </div>
        </div>
        
        <div 
          className="metric-card delete clickable"
          onClick={() => handleCardClick('delete')}
        >
          <div className="metric-icon">🗑️</div>
          <div className="metric-content">
            <div className="metric-label">Delete Operations</div>
            <div className="metric-description">Click to view details</div>
          </div>
        </div>

        <div 
          className="metric-card modify clickable"
          onClick={() => handleCardClick('modify')}
        >
          <div className="metric-icon">🔄</div>
          <div className="metric-content">
            <div className="metric-label">Modifications</div>
            <div className="metric-description">Click to view details</div>
          </div>
        </div>

        <div 
          className="metric-card total clickable"
          onClick={() => handleCardClick('all')}
        >
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-label">Total Events</div>
            <div className="metric-description">Click to view details</div>
          </div>
        </div>
      </div>

      {highLoadPaths && highLoadPaths.length > 0 && (
        <div className="high-load-alert">
          <div className="alert-header">
            <span className="alert-icon">⚠️</span>
            <span className="alert-title">High-Load Paths Detected</span>
          </div>
          <div className="alert-paths">
            {highLoadPaths.slice(0, 5).map((item, idx) => (
              <div key={idx} className="alert-path-item">
                <span className="path-name">{item.path}</span>
                <div className="path-badges">
                  {item.stats.is_high_load && (
                    <span className="badge high-load">High Load</span>
                  )}
                  {item.stats.is_burst && (
                    <span className="badge burst">Burst</span>
                  )}
                </div>
              </div>
            ))}
            {highLoadPaths.length > 5 && (
              <div className="alert-more">
                +{highLoadPaths.length - 5} more paths
              </div>
            )}
          </div>
        </div>
      )}
      {selectedOperation && (
        <EventLogs 
          operationType={selectedOperation}
          onClose={() => setSelectedOperation(null)}
        />
      )}
    </div>
  );
}

export default MetricsOverview;

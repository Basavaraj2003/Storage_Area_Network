import React, { useState } from 'react';
import './HighLoadPaths.css';
import { format } from 'date-fns';
import OperationDetailsModal from './OperationDetailsModal';

function HighLoadPaths({ highLoadPaths }) {
  const [selectedPath, setSelectedPath] = useState(null);
  if (!highLoadPaths || highLoadPaths.length === 0) {
    return (
      <div className="no-high-load">
        <div className="no-data-icon">✅</div>
        <h3>No Hotspots Detected</h3>
        <p>All monitored paths are operating within normal thresholds.</p>
      </div>
    );
  }

  return (
    <div className="high-load-paths">
      <div className="paths-header">
        <h3>Hotspot Paths</h3>
        <span className="paths-count">{highLoadPaths.length} paths</span>
      </div>
      <div className="paths-list">
        {highLoadPaths.map((item, idx) => {
          const { path, stats } = item;
          const lastAccessed = stats.last_accessed
            ? format(new Date(stats.last_accessed * 1000), 'HH:mm:ss')
            : 'N/A';

          const rawLast = stats.last_event_type;
          let lastEventLabel = null;
          if (rawLast) {
            if (['moved', 'moved_to', 'rename', 'RENAME'].includes(rawLast)) {
              lastEventLabel = 'Created';
            } else {
              lastEventLabel = rawLast.charAt(0).toUpperCase() + rawLast.slice(1);
            }
          }

          return (
            <div key={idx} className="path-card" onClick={() => setSelectedPath(path)}>
              <div className="path-header">
                <div className="path-name-section">
                  <span className="path-icon">📁</span>
                  <span className="path-name" title={path}>{path}</span>
                </div>
                <div className="path-badges">
                  {stats.is_hotspot && (
                    <span className="badge hotspot">Hotspot</span>
                  )}
                </div>
              </div>
              <div className="path-stats">
                <div className="stat-item">
                  <span className="stat-label">Reads</span>
                  <span className="stat-value read">{stats.total_reads}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Writes</span>
                  <span className="stat-value write">{stats.total_writes}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Modifications</span>
                  <span className="stat-value modify">{stats.total_modifications}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last Accessed</span>
                  <span className="stat-value time">{lastAccessed}</span>
                </div>
                {lastEventLabel && (
                  <div className="stat-item last-event">
                    <span className="stat-label">Last Operation</span>
                    <span className="stat-value event">{lastEventLabel}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedPath && (
        <OperationDetailsModal
          filePath={selectedPath}
          operationType={null}
          onClose={() => setSelectedPath(null)}
        />
      )}
    </div>
  );
}

export default HighLoadPaths;

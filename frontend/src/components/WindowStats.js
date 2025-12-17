import React from 'react';
import './WindowStats.css';
import { format } from 'date-fns';

function WindowStats({ recentHistory, currentWindow }) {
  const allWindows = [...(recentHistory || []), ...(currentWindow ? [currentWindow] : [])];

  return (
    <div className="window-stats">
      <div className="window-stats-header">
        <h3>Time Window Statistics</h3>
        <span className="windows-count">{allWindows.length} windows</span>
      </div>
      
      <div className="windows-table-container">
        <table className="windows-table">
          <thead>
            <tr>
              <th>Window Start</th>
              <th>Reads</th>
              <th>Writes</th>
              <th>Modifications</th>
              <th>Total Events</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allWindows.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  No window data available yet
                </td>
              </tr>
            ) : (
              allWindows.slice().reverse().map((window, idx) => {
                const isCurrent = idx === 0 && currentWindow;
                const timestamp = window.window_start;
                const date = new Date(timestamp * 1000);
                const timeStr = format(date, 'HH:mm:ss');
                
                const totalEvents = (window.read_count || 0) + (window.write_count || 0);
                const isHighActivity = totalEvents > 50;

                return (
                  <tr key={idx} className={isCurrent ? 'current-window' : ''}>
                    <td>
                      <span className="time-value">{timeStr}</span>
                      {isCurrent && <span className="current-badge">Current</span>}
                    </td>
                    <td>
                      <span className="count-value read">{window.read_count || 0}</span>
                    </td>
                    <td>
                      <span className="count-value write">{window.write_count || 0}</span>
                    </td>
                    <td>
                      <span className="count-value modify">{window.modification_count || 0}</span>
                    </td>
                    <td>
                      <span className="count-value total">{totalEvents}</span>
                    </td>
                    <td>
                      {isHighActivity ? (
                        <span className="status-badge high">High Activity</span>
                      ) : (
                        <span className="status-badge normal">Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WindowStats;

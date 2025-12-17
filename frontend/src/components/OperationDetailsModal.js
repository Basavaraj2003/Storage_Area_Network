import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import './OperationDetailsModal.css';
import { useAuth } from '../contexts/AuthContext.js';

function OperationDetailsModal({ operationType, filePath = null, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationType, filePath]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const fileFilter = filePath ? `&file_path_filter=${encodeURIComponent(filePath)}` : '';

      if (operationType === 'WRITE') {
        const response = await axios.get(`/api/audit/logs?limit=500${fileFilter}`);
        const all = response.data.logs || [];
        const writeOps = ['CREATE', 'MODIFY', 'DELETE', 'RENAME', 'WRITE'];
        setLogs(all.filter(l => writeOps.includes(l.operation_type)));
      } else if (operationType === 'CREATE') {
        // Include RENAME entries as CREATE for UI
        const respA = await axios.get(`/api/audit/logs?operation_type=CREATE&limit=200${fileFilter}`);
        const respB = await axios.get(`/api/audit/logs?operation_type=RENAME&limit=200${fileFilter}`);
        const a = respA.data.logs || [];
        const b = respB.data.logs || [];
        setLogs(a.concat(b));
      } else {
        const url = operationType
          ? `/api/audit/logs?operation_type=${operationType}&limit=200${fileFilter}`
          : `/api/audit/logs?limit=200${fileFilter}`;
        const response = await axios.get(url);
        setLogs(response.data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getOperationTypeColor = (type) => {
    const t = (type === 'RENAME') ? 'CREATE' : type;
    switch (t) {
      case 'CREATE': return '#10b981';
      case 'MODIFY': return '#f59e0b';
      case 'DELETE': return '#ef4444';
      case 'RENAME': return '#8b5cf6';
      case 'WRITE': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const getOperationLabel = (type) => {
    const t = (type === 'RENAME') ? 'CREATE' : type;
    if (!t) return 'All Operations';
    switch (t) {
      case 'CREATE': return 'Create Operations';
      case 'MODIFY': return 'Modify Operations';
      case 'DELETE': return 'Delete Operations';
      case 'RENAME': return 'Rename Operations';
      case 'WRITE': return 'Write Operations';
      default: return 'Operations';
    }
  };

  const handleCorrect = async (log) => {
    if (!isAuthenticated) return alert('Authentication required');
    const corrected = prompt(`Enter corrected username for audit id ${log.id}:`, log.username || '');
    if (!corrected) return;
    const reason = prompt('Reason for correction (optional):', '');
    try {
      await axios.post(`/api/audit/${log.id}/correct`, {
        corrected_username: corrected,
        reason
      });
      fetchLogs();
      alert('Correction recorded');
    } catch (err) {
      console.error('Correction failed', err);
      alert('Correction failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getOperationLabel(operationType)}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="no-logs">No {operationType || ''} operations found</div>
          ) : (
            <div className="logs-list">
              {logs.map(log => {
                const displayOp = (log.operation_type === 'RENAME') ? 'CREATE' : log.operation_type;
                return (
                  <div key={log.id} className="log-item">
                    <div className="log-header">
                      <span
                        className="operation-badge"
                        style={{ 
                          backgroundColor: getOperationTypeColor(log.operation_type) + '20', 
                          color: getOperationTypeColor(log.operation_type) 
                        }}
                      >
                        {displayOp}
                      </span>
                      <span className="log-time">
                        {format(new Date(log.timestamp * 1000), 'MMM d, yyyy h:mm:ss a')}
                      </span>
                    </div>
                    <div className="log-path" title={log.file_path}>
                      📁 {log.file_path}
                    </div>
                    <div className="log-meta">
                      <span className="log-user">👤 {log.username || 'System'}</span>
                      <span className="log-type">{log.is_directory ? '📂 Directory' : '📄 File'}</span>
                      {isAuthenticated && (
                        <button className="log-correct" onClick={() => handleCorrect(log)}>Correct</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OperationDetailsModal;

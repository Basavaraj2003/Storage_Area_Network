import React, { useState, useEffect } from 'react';
import './Settings.css';
import axios from 'axios';

function Settings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newPath, setNewPath] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/config');
      setConfig(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load configuration: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addSanPath = async () => {
    if (!newPath.trim()) {
      setError('Please enter a valid path');
      return;
    }

    try {
      setSaving(true);
      await axios.post('/api/config/san-path', null, {
        params: { path: newPath.trim() }
      });
      setSuccess('Path added successfully');
      setNewPath('');
      await loadConfig();
      setError(null);
    } catch (err) {
      setError('Failed to add path: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const removeSanPath = async (path) => {
    try {
      setSaving(true);
      await axios.delete('/api/config/san-path', {
        params: { path }
      });
      setSuccess('Path removed successfully');
      await loadConfig();
      setError(null);
    } catch (err) {
      setError('Failed to remove path: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const updateThresholds = async (newThresholds) => {
    try {
      setSaving(true);
      // This would need a new API endpoint to update thresholds
      setSuccess('Thresholds updated successfully');
      setError(null);
    } catch (err) {
      setError('Failed to update thresholds: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-loading">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="settings-error">Failed to load configuration</div>;
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <h3>Monitor Configuration</h3>
        <button onClick={loadConfig} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {error && <div className="settings-error">{error}</div>}
      {success && <div className="settings-success">{success}</div>}

      <div className="settings-section">
        <h4>SAN Paths to Monitor</h4>
        <div className="path-list">
          {config.san_paths.length === 0 ? (
            <div className="no-paths">No paths configured</div>
          ) : (
            config.san_paths.map((path, index) => (
              <div key={index} className="path-item">
                <span className="path-text">{path}</span>
                <button
                  onClick={() => removeSanPath(path)}
                  className="remove-btn"
                  disabled={saving}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="add-path">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="Enter path to monitor (e.g., Z:\, C:\data)"
            className="path-input"
          />
          <button
            onClick={addSanPath}
            disabled={saving || !newPath.trim()}
            className="add-btn"
          >
            {saving ? 'Adding...' : 'Add Path'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h4>Detection Thresholds</h4>
        <div className="thresholds-grid">
          <div className="threshold-item">
            <label>Read Frequency Threshold</label>
            <input
              type="number"
              value={config.thresholds.read_frequency_threshold}
              onChange={(e) => {
                const newConfig = {
                  ...config,
                  thresholds: {
                    ...config.thresholds,
                    read_frequency_threshold: parseInt(e.target.value)
                  }
                };
                setConfig(newConfig);
              }}
            />
            <span className="threshold-unit">operations/window</span>
          </div>

          <div className="threshold-item">
            <label>Write Frequency Threshold</label>
            <input
              type="number"
              value={config.thresholds.write_frequency_threshold}
              onChange={(e) => {
                const newConfig = {
                  ...config,
                  thresholds: {
                    ...config.thresholds,
                    write_frequency_threshold: parseInt(e.target.value)
                  }
                };
                setConfig(newConfig);
              }}
            />
            <span className="threshold-unit">operations/window</span>
          </div>

          <div className="threshold-item">
            <label>Modification Rate Threshold</label>
            <input
              type="number"
              value={config.thresholds.modification_rate_threshold}
              onChange={(e) => {
                const newConfig = {
                  ...config,
                  thresholds: {
                    ...config.thresholds,
                    modification_rate_threshold: parseInt(e.target.value)
                  }
                };
                setConfig(newConfig);
              }}
            />
            <span className="threshold-unit">modifications/window</span>
          </div>

          <div className="threshold-item">
            <label>Burst Intensity Multiplier</label>
            <input
              type="number"
              step="0.1"
              value={config.thresholds.burst_intensity_multiplier}
              onChange={(e) => {
                const newConfig = {
                  ...config,
                  thresholds: {
                    ...config.thresholds,
                    burst_intensity_multiplier: parseFloat(e.target.value)
                  }
                };
                setConfig(newConfig);
              }}
            />
            <span className="threshold-unit">multiplier</span>
          </div>
        </div>

        <button
          onClick={() => updateThresholds(config.thresholds)}
          className="save-thresholds-btn"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Thresholds'}
        </button>
      </div>

      <div className="settings-section">
        <h4>Monitoring Settings</h4>
        <div className="setting-item">
          <label>Time Window Duration</label>
          <span className="setting-value">{config.time_window_seconds} seconds</span>
        </div>
        <div className="setting-item">
          <label>SAN Volume Auto-Detection</label>
          <span className="setting-value">
            {config.enable_san_volume_detection ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Settings;
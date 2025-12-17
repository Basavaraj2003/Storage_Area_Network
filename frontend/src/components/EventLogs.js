import React, { useState, useEffect, useRef } from 'react';
import './EventLogs.css';
import axios from 'axios';

function EventLogs({ operationType, onClose }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // all, 1m, 5m, 15m, 1h, custom
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [eventCounts, setEventCounts] = useState({});
  const [showCustomTimeRange, setShowCustomTimeRange] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const eventsEndRef = useRef(null);
  const wsRef = useRef(null);

  const operationTypes = {
    read: { label: 'Read Operations', icon: '📖', color: '#3b82f6' },
    write: { label: 'Write Operations', icon: '✏️', color: '#f59e0b' },
    create: { label: 'Create Operations', icon: '📝', color: '#10b981' },
    delete: { label: 'Delete Operations', icon: '🗑️', color: '#ef4444' },
    modify: { label: 'Modifications', icon: '🔄', color: '#8b5cf6' },
    all: { label: 'All Operations', icon: '📊', color: '#6b7280' }
  };

  // Remove auto-scroll functionality

  useEffect(() => {
    // Connect to WebSocket for real-time events
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.REACT_APP_WS_PORT || '8001';
      const wsUrl = `${protocol}//${host}:${port}/ws`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('EventLogs WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.current_window && data.current_window.events) {
            // Process new events from current window
            const newEvents = data.current_window.events.map(evt => ({
              ...evt,
              id: `${evt.timestamp}-${evt.path}-${evt.event_type}-${Math.random()}`,
              timestamp: evt.timestamp || Date.now() / 1000
            }));
            
            if (newEvents.length > 0) {
              setEvents(prevEvents => {
                // Remove duplicates and add new events
                const existingIds = new Set(prevEvents.map(e => `${e.timestamp}-${e.path}-${e.event_type}`));
                const uniqueNewEvents = newEvents.filter(e => 
                  !existingIds.has(`${e.timestamp}-${e.path}-${e.event_type}`)
                );
                
                const combined = [...prevEvents, ...uniqueNewEvents];
                // Keep only last 1000 events for performance
                return combined.slice(-1000).sort((a, b) => b.timestamp - a.timestamp);
              });
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('EventLogs WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('EventLogs WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
    };

    // Load initial events from database
    const loadInitialEvents = async () => {
      try {
        setLoading(true);
        // Load events from database with larger limit for historical data
        const response = await axios.get('/api/events?limit=5000');
        
        const allEvents = response.data.events.map(evt => ({
          ...evt,
          id: `${evt.timestamp}-${evt.path}-${evt.event_type}-${Math.random()}`,
        }));
        
        setEvents(allEvents.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error('Failed to load initial events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialEvents();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Filter events based on operation type and filters
    let filtered = events;

    // Filter by time range
    if (timeFilter !== 'all') {
      const now = Date.now() / 1000;
      let startTime, endTime;
      
      if (timeFilter === 'custom') {
        // Custom time range
        startTime = customStartTime ? new Date(customStartTime).getTime() / 1000 : 0;
        endTime = customEndTime ? new Date(customEndTime).getTime() / 1000 : now;
      } else {
        // Predefined time ranges
        switch (timeFilter) {
          case '1m': startTime = now - 60; break;
          case '5m': startTime = now - 300; break;
          case '15m': startTime = now - 900; break;
          case '1h': startTime = now - 3600; break;
          case '6h': startTime = now - 21600; break;
          case '24h': startTime = now - 86400; break;
          default: startTime = 0;
        }
        endTime = now;
      }
      
      filtered = filtered.filter(event => 
        event.timestamp >= startTime && event.timestamp <= endTime
      );
    }

    // Filter by operation type
    if (operationType !== 'all') {
      filtered = filtered.filter(event => {
        switch (operationType) {
          case 'read':
            // File system watchers can't detect reads, so we show creates as proxy
            return event.event_type === 'created';
          case 'write':
            // Write operations are modifications and moves
            return event.event_type === 'modified' || event.event_type === 'moved' || event.event_type === 'moved_to';
          case 'create':
            return event.event_type === 'created';
          case 'delete':
            return event.event_type === 'deleted';
          case 'modify':
            return event.event_type === 'modified';
          default:
            return true;
        }
      });
    }

    // Filter by path
    if (pathFilter) {
      filtered = filtered.filter(event => 
        event.path.toLowerCase().includes(pathFilter.toLowerCase())
      );
    }

    // Filter by general search
    if (filter) {
      filtered = filtered.filter(event => 
        event.path.toLowerCase().includes(filter.toLowerCase()) ||
        event.event_type.toLowerCase().includes(filter.toLowerCase())
      );
    }

    setFilteredEvents(filtered);

    // Calculate event counts by type for the filtered time range
    const counts = {
      created: 0,
      modified: 0,
      deleted: 0,
      moved: 0,
      moved_to: 0,
      total: filtered.length,
      write_operations: 0, // modified + moved + moved_to
      read_operations: 0,  // created (proxy for reads)
      create_operations: 0, // created
      delete_operations: 0, // deleted
      modify_operations: 0  // modified
    };

    filtered.forEach(event => {
      // Count individual event types
      if (counts.hasOwnProperty(event.event_type)) {
        counts[event.event_type]++;
      }
      
      // Count operation categories
      switch (event.event_type) {
        case 'created':
          counts.read_operations++;
          counts.create_operations++;
          break;
        case 'modified':
          counts.write_operations++;
          counts.modify_operations++;
          break;
        case 'moved':
        case 'moved_to':
          counts.write_operations++;
          break;
        case 'deleted':
          counts.delete_operations++;
          break;
      }
    });

    setEventCounts(counts);
  }, [events, operationType, filter, pathFilter, timeFilter]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'created': return '📝';
      case 'modified': return '🔄';
      case 'deleted': return '🗑️';
      case 'read': return '📖';
      case 'write': return '✏️';
      case 'moved': 
      case 'moved_to': return '📦';
      default: return '📄';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'created': return '#10b981';
      case 'modified': return '#8b5cf6';
      case 'deleted': return '#ef4444';
      case 'read': return '#3b82f6';
      case 'write': return '#f59e0b';
      case 'moved':
      case 'moved_to': return '#6b7280';
      default: return '#94a3b8';
    }
  };

  const getDisplayEventType = (eventType, operationType) => {
    // Map raw event types to user-friendly operation names based on context
    switch (operationType) {
      case 'write':
        if (eventType === 'modified') return 'WRITE';
        if (eventType === 'moved' || eventType === 'moved_to') return 'WRITE';
        break;
      case 'read':
        if (eventType === 'created') return 'READ';
        break;
      case 'create':
        if (eventType === 'created') return 'CREATE';
        break;
      case 'delete':
        if (eventType === 'deleted') return 'DELETE';
        break;
      case 'modify':
        if (eventType === 'modified') return 'MODIFY';
        break;
      default:
        // For 'all' operations, show the actual event type
        return eventType.toUpperCase();
    }
    return eventType.toUpperCase();
  };

  const handleDeleteEvents = async (days) => {
    try {
      const response = await axios.delete(`/api/events/cleanup?days=${days}`);
      alert(`Deleted ${response.data.deleted_count} events older than ${days} days`);
      // Reload events after deletion
      const eventsResponse = await axios.get('/api/events?limit=5000');
      const allEvents = eventsResponse.data.events.map(evt => ({
        ...evt,
        id: `${evt.timestamp}-${evt.path}-${evt.event_type}-${Math.random()}`,
      }));
      setEvents(allEvents.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Failed to delete events:', error);
      alert('Failed to delete events');
    }
  };

  const currentOp = operationTypes[operationType] || operationTypes.all;

  return (
    <div className="event-logs-modal">
      <div className="event-logs-content">
        <div className="event-logs-header">
          <div className="event-logs-title">
            <span className="event-icon" style={{ color: currentOp.color }}>
              {currentOp.icon}
            </span>
            <h3>{currentOp.label}</h3>
            <span className="event-count">({filteredEvents.length} events)</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="event-logs-filters">
          <div className="time-filter-section">
            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setShowCustomTimeRange(e.target.value === 'custom');
              }}
              className="time-filter-select"
            >
              <option value="all">All Time</option>
              <option value="1m">Last 1 Minute</option>
              <option value="5m">Last 5 Minutes</option>
              <option value="15m">Last 15 Minutes</option>
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {showCustomTimeRange && (
              <div className="custom-time-range">
                <div className="time-input-group">
                  <label>From:</label>
                  <input
                    type="datetime-local"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="time-input"
                  />
                </div>
                <div className="time-input-group">
                  <label>To:</label>
                  <input
                    type="datetime-local"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="time-input"
                  />
                </div>
              </div>
            )}
          </div>
          
          <input
            type="text"
            placeholder="Search events..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-input"
          />
          <input
            type="text"
            placeholder="Filter by path..."
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            className="filter-input"
          />
          <button
            className="delete-options-btn"
            onClick={() => setShowDeleteOptions(!showDeleteOptions)}
          >
            🗑️ Cleanup
          </button>
        </div>

        {showDeleteOptions && (
          <div className="delete-options">
            <h4>Delete Old Events</h4>
            <div className="delete-buttons">
              <button
                className="delete-btn"
                onClick={() => handleDeleteEvents(1)}
              >
                Delete Last 24 Hours
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteEvents(10)}
              >
                Delete Last 10 Days
              </button>
              <button
                className="delete-btn danger"
                onClick={() => handleDeleteEvents(365)}
              >
                Delete All Events
              </button>
            </div>
          </div>
        )}

        {timeFilter !== 'all' && (
          <div className="event-stats">
            <div className="operation-stats">
              <h4>Operation Counts {timeFilter === 'custom' ? '(Custom Range)' : `(${timeFilter})`}</h4>
              <div className="stats-grid">
                {operationType === 'write' || operationType === 'all' ? (
                  <div className="stat-item highlight">
                    <span className="stat-icon">✏️</span>
                    <span className="stat-label">Write Operations:</span>
                    <span className="stat-value">{eventCounts.write_operations || 0}</span>
                  </div>
                ) : null}
                {operationType === 'read' || operationType === 'all' ? (
                  <div className="stat-item highlight">
                    <span className="stat-icon">📖</span>
                    <span className="stat-label">Read Operations:</span>
                    <span className="stat-value">{eventCounts.read_operations || 0}</span>
                  </div>
                ) : null}
                {operationType === 'create' || operationType === 'all' ? (
                  <div className="stat-item highlight">
                    <span className="stat-icon">📝</span>
                    <span className="stat-label">Create Operations:</span>
                    <span className="stat-value">{eventCounts.create_operations || 0}</span>
                  </div>
                ) : null}
                {operationType === 'delete' || operationType === 'all' ? (
                  <div className="stat-item highlight">
                    <span className="stat-icon">🗑️</span>
                    <span className="stat-label">Delete Operations:</span>
                    <span className="stat-value">{eventCounts.delete_operations || 0}</span>
                  </div>
                ) : null}
                {operationType === 'modify' || operationType === 'all' ? (
                  <div className="stat-item highlight">
                    <span className="stat-icon">🔄</span>
                    <span className="stat-label">Modify Operations:</span>
                    <span className="stat-value">{eventCounts.modify_operations || 0}</span>
                  </div>
                ) : null}
                {operationType === 'all' ? (
                  <div className="stat-item total">
                    <span className="stat-icon">📊</span>
                    <span className="stat-label">Total Events:</span>
                    <span className="stat-value">{eventCounts.total || 0}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="event-logs-list">
          {loading ? (
            <div className="loading-events">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="no-events">No events found</div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.id} className="event-item">
                <div className="event-time">
                  {formatTimestamp(event.timestamp)}
                </div>
                <div className="event-type">
                  <span 
                    className="event-type-icon"
                    style={{ color: getEventColor(event.event_type) }}
                  >
                    {getEventIcon(event.event_type)}
                  </span>
                  <span className="event-type-text">
                    {getDisplayEventType(event.event_type, operationType)}
                  </span>
                </div>
                <div className="event-path">
                  {event.path}
                </div>
                <div className="event-details">
                  {event.is_directory ? '📁 Directory' : '📄 File'}
                </div>
              </div>
            ))
          )}
          <div ref={eventsEndRef} />
        </div>
      </div>
    </div>
  );
}

export default EventLogs;
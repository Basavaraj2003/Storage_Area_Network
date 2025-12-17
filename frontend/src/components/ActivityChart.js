import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './ActivityChart.css';

function ActivityChart({ recentHistory, currentWindow }) {
  const chartData = useMemo(() => {
    const data = [...(recentHistory || [])];
    
    // Add current window if available
    if (currentWindow) {
      data.push({
        ...currentWindow,
        window_start: currentWindow.window_start,
        label: 'Current'
      });
    }
    
    // Format data for chart
    return data.map((window, idx) => ({
      time: idx,
      reads: window.read_count || 0,
      writes: window.write_count || 0,
      modifications: window.modification_count || 0,
      total: (window.read_count || 0) + (window.write_count || 0),
      timestamp: window.window_start
    }));
  }, [recentHistory, currentWindow]);

  return (
    <div className="activity-chart">
      <div className="chart-header">
        <h3>I/O Activity Over Time</h3>
        <p className="chart-description">Real-time read/write operations across time windows</p>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorWrites" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorModifications" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="time" 
              stroke="#94a3b8"
              label={{ value: 'Time Window', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
            />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#e2e8f0'
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#e2e8f0' }}
            />
            <Area 
              type="monotone" 
              dataKey="reads" 
              stackId="1"
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorReads)"
              name="Reads"
            />
            <Area 
              type="monotone" 
              dataKey="writes" 
              stackId="1"
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorWrites)"
              name="Writes"
            />
            <Area 
              type="monotone" 
              dataKey="modifications" 
              stackId="1"
              stroke="#f59e0b" 
              fillOpacity={1} 
              fill="url(#colorModifications)"
              name="Modifications"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-stats">
        <div className="chart-stat-item">
          <span className="stat-label">Total Windows</span>
          <span className="stat-value">{chartData.length}</span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">Peak Reads</span>
          <span className="stat-value read">
            {Math.max(...chartData.map(d => d.reads), 0)}
          </span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">Peak Writes</span>
          <span className="stat-value write">
            {Math.max(...chartData.map(d => d.writes), 0)}
          </span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">Peak Modifications</span>
          <span className="stat-value modify">
            {Math.max(...chartData.map(d => d.modifications), 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ActivityChart;

# SAN I/O Workload Monitoring System

A real-time I/O workload monitoring tool for Windows-based SAN (Storage Area Network) environments. This system observes actual read/write operations on SAN-mounted storage, analyzes workload characteristics using time-window-based access counts, and identifies abnormal or bursty I/O behavior.

## Features

- **Real-time Monitoring**: Monitors actual file system events on SAN-mounted volumes (iSCSI, Fibre Channel, SMB-backed)
- **Time-Window Analysis**: Groups I/O events into configurable time windows (default: 1 second) for workload characterization
- **Burst Detection**: Automatically detects sudden spikes in read/write operations using configurable thresholds
- **High-Load Identification**: Marks files and directories as high-load when I/O activity exceeds defined thresholds
- **REST API**: Comprehensive API endpoints for accessing workload data
- **WebSocket Support**: Real-time updates via WebSocket for live dashboard updates
- **Modern Dashboard**: Beautiful, responsive React-based frontend with real-time visualizations

## Architecture

### Backend
- **Python FastAPI**: RESTful API server
- **Watchdog**: Real-time file system event monitoring
- **Time-Window Aggregation**: Groups events into fixed time windows for analysis
- **Burst Detection Algorithm**: Identifies abnormal I/O patterns

### Frontend
- **React**: Modern UI framework
- **Recharts**: Data visualization
- **WebSocket**: Real-time data streaming
- **Tailwind-inspired CSS**: Modern, responsive design

## Quick Start

### 1. Verify Setup
```bash
python verify_setup.py
```

### 2. Install Dependencies

**Backend:**
```bash
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 3. Configure SAN Path

Edit `config.json` (created automatically on first run):
```json
{
  "san_paths": ["Z:\\"],
  "time_window_seconds": 1,
  "thresholds": {
    "read_frequency_threshold": 100,
    "write_frequency_threshold": 100,
    "modification_rate_threshold": 50,
    "burst_intensity_multiplier": 3.0,
    "burst_time_window_seconds": 5
  }
}
```

### 4. Start the System

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Generate Real Workload:**
```bash
python workload_generator.py Z:\SAN_TEST 10 3
```

## Real Workload Generation

The `workload_generator.py` script performs **REAL** file operations on your SAN storage:

- ✅ Creates actual files with random content
- ✅ Modifies files repeatedly (append + overwrite)
- ✅ Renames files (triggers move events)
- ✅ Deletes files
- ✅ Recreates deleted files
- ✅ Creates subdirectories
- ✅ Performs rapid operations to trigger burst detection

**All operations are REAL** - no simulation, no mock data. Every file operation generates actual I/O events that are detected by the monitoring system.

## Configuration

### SAN Paths
Add your SAN-mounted drive paths to the `san_paths` array in `config.json`. The system will monitor all subdirectories recursively.

### Time Windows
Adjust `time_window_seconds` to change the granularity of I/O analysis. Default is 1 second.

### Thresholds
- **read_frequency_threshold**: Number of reads per window to mark as high-load
- **write_frequency_threshold**: Number of writes per window to mark as high-load
- **modification_rate_threshold**: Number of modifications per window to mark as high-load
- **burst_intensity_multiplier**: Multiplier above average activity to detect bursts (default: 3.0x)
- **burst_time_window_seconds**: Time window for burst detection analysis

## API Endpoints

### GET `/api/workload`
Get current I/O workload statistics

### GET `/api/workload/history?limit=100`
Get historical workload data

### GET `/api/path/{path}`
Get detailed statistics for a specific path

### GET `/api/paths/high-load`
Get all paths currently marked as high-load or burst

### GET `/api/config`
Get current configuration

### POST `/api/config/san-path?path=Z:\\`
Add a SAN path to monitor

### DELETE `/api/config/san-path?path=Z:\\`
Remove a SAN path from monitoring

### GET `/api/stats/summary`
Get summary statistics

## WebSocket

Connect to `ws://localhost:8000/ws` for real-time workload updates. The server broadcasts workload data every 500ms.

## Dashboard Features

- **Overview Tab**: Real-time metrics for reads, writes, modifications, and total events
- **Activity Chart**: Visual timeline of I/O operations across time windows
- **High-Load Paths**: List of paths exceeding thresholds with detailed statistics
- **Time Windows**: Tabular view of all time windows with activity breakdown

## Monitoring Real SAN Storage

This system is designed to monitor actual SAN-mounted storage volumes. To ensure you're monitoring SAN storage:

1. **iSCSI Volumes**: Mount your iSCSI targets and add the mount point to `san_paths`
2. **Fibre Channel**: Add FC-mounted drive paths to `san_paths`
3. **SMB/CIFS**: Add network share paths that are backed by SAN storage
4. **Volume Detection**: The system attempts to detect SAN volumes automatically, but explicit configuration is recommended

## Performance Considerations

- The system maintains a rolling history of the last 1000 time windows
- Path statistics are kept in memory for fast access
- WebSocket updates are throttled to 500ms intervals
- File system events are processed asynchronously to minimize overhead

## Troubleshooting

### No Events Detected
- Verify SAN paths exist and are accessible
- Check that files are actually being accessed on the monitored paths
- Ensure the paths are on SAN-mounted volumes, not local drives
- Run `python verify_setup.py` to check configuration

### High CPU Usage
- Increase `time_window_seconds` to reduce event processing frequency
- Reduce the number of monitored paths
- Check for excessive file system activity

### WebSocket Connection Issues
- Verify backend is running on port 8000
- Check firewall settings
- Ensure CORS is properly configured

## Files Structure

```
sanfinal/
├── backend/
│   ├── main.py          # FastAPI application
│   ├── monitor.py       # I/O monitoring core
│   ├── api.py           # REST API endpoints
│   └── config.py        # Configuration management
├── frontend/
│   ├── src/
│   │   ├── App.js       # Main React app
│   │   ├── components/  # Dashboard components
│   │   └── services/    # WebSocket service
│   └── package.json
├── workload_generator.py # Real file operations generator
├── verify_setup.py      # Setup verification script
├── requirements.txt     # Python dependencies
├── config.json         # Configuration (auto-created)
└── README.md
```

## Important Notes

- **Real-time Monitoring**: All I/O events are captured from actual file system operations, not simulated data
- **SAN-Specific**: The system is configured to monitor only SAN-mounted storage volumes
- **Time-Window Analysis**: Based on research techniques for SAN workload characterization
- **Burst Detection**: Uses statistical analysis to identify abnormal I/O patterns
- **No Mock Data**: The workload generator creates real files - ensure you have sufficient storage space

## License

This project is provided as-is for SAN workload monitoring and analysis.

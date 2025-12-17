# SAN I/O Workload Monitor

A real-time Storage Area Network (SAN) I/O monitoring application that tracks file system operations and provides comprehensive analytics for storage performance optimization.

## Features

### 🔐 Authentication System
- User registration and login
- JWT-based authentication
- Secure session management
- Database-stored user credentials

### 📊 Real-time Monitoring
- Live file system event tracking
- WebSocket-based real-time updates
- Operation categorization (Read, Write, Create, Delete, Modify)
- Path-specific monitoring with configurable SAN paths

### 📈 Analytics Dashboard
- Interactive operation metrics cards
- Time-filtered event analysis
- Historical data visualization
- High-load path detection
- Burst activity monitoring

### 💾 Data Persistence
- SQLite database for event storage
- Historical event retrieval
- Configurable data retention
- Bulk cleanup operations (24 hours, 10 days, all events)

### ⚙️ Configuration Management
- Configurable SAN paths monitoring
- Adjustable performance thresholds
- Time window customization
- Settings management interface

## Technology Stack

### Backend
- **Python 3.8+**
- **FastAPI** - Modern web framework
- **SQLite** - Database for event storage
- **Watchdog** - File system monitoring
- **WebSockets** - Real-time communication
- **JWT** - Authentication tokens

### Frontend
- **React 18** - User interface
- **JavaScript ES6+** - Frontend logic
- **CSS3** - Styling and animations
- **WebSocket Client** - Real-time updates
- **Axios** - HTTP client

## Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn package manager

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r ../requirements.txt
   ```

3. Initialize the database:
   ```bash
   python init_db.py
   ```

4. Configure SAN paths in `config.json`:
   ```json
   {
     "san_paths": ["Z:\\", "C:\\YourSANPath"],
     "time_window_seconds": 10,
     "thresholds": {
       "read_frequency_threshold": 100,
       "write_frequency_threshold": 100,
       "modification_rate_threshold": 50
     }
   }
   ```

5. Start the backend server:
   ```bash
   python main.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage

### Initial Setup
1. Open your browser and navigate to `http://localhost:3000`
2. Register a new user account or login with existing credentials
3. Configure your SAN paths in the Settings tab
4. Start monitoring your storage operations

### Monitoring Operations
- **Dashboard View**: Overview of all operation types with clickable cards
- **Operation Details**: Click any operation card to view detailed events
- **Time Filtering**: Apply time ranges to analyze specific periods
- **Real-time Updates**: Watch live file system events as they occur

### Data Management
- **Event History**: View historical events stored in the database
- **Cleanup Options**: Remove old events (24 hours, 10 days, or all)
- **Export Capabilities**: Access event data via REST API endpoints

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Events
- `GET /api/events` - Retrieve events with optional filtering
- `GET /api/events/stats` - Get operation statistics
- `DELETE /api/events/cleanup` - Bulk delete old events

### Monitoring
- `GET /api/workload` - Current workload statistics
- `WebSocket /ws` - Real-time event stream

## Configuration

### SAN Paths
Configure the paths to monitor in `backend/config.json`:
```json
{
  "san_paths": ["Z:\\", "\\\\server\\share"],
  "enable_san_volume_detection": true
}
```

### Performance Thresholds
Adjust monitoring sensitivity:
```json
{
  "thresholds": {
    "read_frequency_threshold": 100,
    "write_frequency_threshold": 100,
    "modification_rate_threshold": 50,
    "burst_intensity_multiplier": 3.0
  }
}
```

## Development

### Testing
Run backend tests:
```bash
cd backend
python debug_events.py
python test_events.py
```

### Database Schema
The application uses SQLite with the following main tables:
- `users` - User authentication data
- `events` - File system events with timestamps and metadata

## Limitations

### File System Monitoring
- **Read Operations**: Cannot be directly detected by file system watchers (this is a limitation of the underlying OS APIs)
- **Network Latency**: Remote SAN monitoring may have slight delays
- **Permission Requirements**: Requires appropriate file system permissions

### SAN-Specific Features
This application provides file-level monitoring rather than true SAN block-level monitoring. For enterprise SAN environments, consider integrating with:
- Storage array management APIs
- SNMP monitoring for SAN switches
- Fibre Channel HBA monitoring tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the GitHub Issues page
2. Review the configuration documentation
3. Ensure proper file system permissions
4. Verify SAN path accessibility

## Future Enhancements

- [ ] Integration with enterprise storage APIs
- [ ] Advanced analytics and reporting
- [ ] Email/SMS alerting for high-load conditions
- [ ] Multi-user role management
- [ ] Export to CSV/Excel functionality
- [ ] Docker containerization
- [ ] Kubernetes deployment support
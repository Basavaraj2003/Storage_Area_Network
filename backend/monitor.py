"""
Core I/O monitoring module using watchdog for real-time file system events
"""
import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent
import json

from config import Config


class IOEvent:
    """Represents a single I/O event"""
    def __init__(self, event_type: str, path: str, is_directory: bool = False):
        self.event_type = event_type  # 'read', 'write', 'modified', 'created', 'deleted'
        self.path = path
        self.is_directory = is_directory
        self.timestamp = time.time()
        self.datetime = datetime.now()


class TimeWindow:
    """Represents I/O statistics for a time window"""
    def __init__(self, window_start: float):
        self.window_start = window_start
        self.read_count = 0
        self.write_count = 0
        self.modification_count = 0
        self.file_reads: Dict[str, int] = defaultdict(int)
        self.file_writes: Dict[str, int] = defaultdict(int)
        self.file_modifications: Dict[str, int] = defaultdict(int)
        self.directory_reads: Dict[str, int] = defaultdict(int)
        self.directory_writes: Dict[str, int] = defaultdict(int)
        self.events: List[IOEvent] = []
    
    def add_event(self, event: IOEvent):
        """Add an event to this time window"""
        self.events.append(event)
        
        # Count events properly based on actual event types
        if event.event_type == 'created':
            if event.is_directory:
                self.directory_reads[event.path] += 1
            else:
                self.file_reads[event.path] += 1
            self.read_count += 1
        elif event.event_type == 'modified':
            if event.is_directory:
                self.directory_writes[event.path] += 1
            else:
                self.file_writes[event.path] += 1
                self.file_modifications[event.path] += 1
            self.write_count += 1
            self.modification_count += 1
        elif event.event_type in ['moved', 'moved_to']:
            if event.is_directory:
                self.directory_writes[event.path] += 1
            else:
                self.file_writes[event.path] += 1
            self.write_count += 1
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        # Convert events to dict format
        events_list = []
        for ev in self.events:
            events_list.append({
                'event_type': ev.event_type,
                'path': ev.path,
                'is_directory': ev.is_directory,
                'timestamp': ev.timestamp
            })
        
        return {
            "window_start": self.window_start,
            "read_count": self.read_count,
            "write_count": self.write_count,
            "modification_count": self.modification_count,
            "file_reads": dict(self.file_reads),
            "file_writes": dict(self.file_writes),
            "file_modifications": dict(self.file_modifications),
            "directory_reads": dict(self.directory_reads),
            "directory_writes": dict(self.directory_writes),
            "total_events": len(self.events),
            "events": events_list
        }


class SANFileSystemHandler(FileSystemEventHandler):
    """File system event handler for SAN monitoring"""
    
    def __init__(self, monitor: 'IOMonitor'):
        super().__init__()
        self.monitor = monitor
    
    def on_created(self, event: FileSystemEvent):
        """Handle file/directory creation"""
        if self.monitor.config.is_san_path(event.src_path):
            io_event = IOEvent('created', event.src_path, event.is_directory)
            self.monitor.process_event(io_event)
    
    def on_modified(self, event: FileSystemEvent):
        """Handle file/directory modification"""
        if self.monitor.config.is_san_path(event.src_path):
            io_event = IOEvent('modified', event.src_path, event.is_directory)
            self.monitor.process_event(io_event)
    
    def on_deleted(self, event: FileSystemEvent):
        """Handle file/directory deletion"""
        if self.monitor.config.is_san_path(event.src_path):
            io_event = IOEvent('deleted', event.src_path, event.is_directory)
            self.monitor.process_event(io_event)
    
    def on_moved(self, event: FileSystemEvent):
        """Handle file/directory move"""
        if self.monitor.config.is_san_path(event.src_path):
            io_event = IOEvent('moved', event.src_path, event.is_directory)
            self.monitor.process_event(io_event)
            if hasattr(event, 'dest_path') and event.dest_path:
                if self.monitor.config.is_san_path(event.dest_path):
                    io_event = IOEvent('moved_to', event.dest_path, event.is_directory)
                    self.monitor.process_event(io_event)


class IOMonitor:
    """Main I/O monitoring class"""
    
    def __init__(self, config: Config):
        self.config = config
        self.observer: Optional[Observer] = None
        self.handler: Optional[SANFileSystemHandler] = None
        self.running = False
        self.lock = threading.Lock()
        
        # Time window management
        self.current_window: Optional[TimeWindow] = None
        self.window_history: deque = deque(maxlen=1000)  # Keep last 1000 windows
        self.window_start_time = time.time()
        
        # Per-path statistics
        self.path_statistics: Dict[str, Dict] = defaultdict(lambda: {
            'total_reads': 0,
            'total_writes': 0,
            'total_modifications': 0,
            'read_history': deque(maxlen=100),
            'write_history': deque(maxlen=100),
            'modification_history': deque(maxlen=100),
            'last_accessed': None,
            'is_high_load': False,
            'is_burst': False
        })
        
        # Burst detection
        self.recent_windows: deque = deque(maxlen=60)  # Keep last 60 windows for burst detection
    
    def start(self):
        """Start monitoring"""
        if self.running:
            return
        
        self.running = True
        self.observer = Observer()
        self.handler = SANFileSystemHandler(self)
        
        # Start monitoring each configured SAN path
        for san_path in self.config.san_paths:
            if Path(san_path).exists():
                self.observer.schedule(
                    self.handler,
                    san_path,
                    recursive=True
                )
                print(f"Monitoring SAN path: {san_path}")
            else:
                print(f"Warning: SAN path does not exist: {san_path}")
        
        if self.config.san_paths:
            self.observer.start()
            print("I/O Monitor started")
        else:
            print("Warning: No SAN paths configured. Please add paths in config.json")
    
    def stop(self):
        """Stop monitoring"""
        if self.observer and self.observer.is_alive():
            self.observer.stop()
            self.observer.join()
        self.running = False
        print("I/O Monitor stopped")
    
    def process_event(self, event: IOEvent):
        """Process an I/O event"""
        with self.lock:
            current_time = time.time()
            window_duration = self.config.time_window_seconds
            
            # Store event in database
            self._store_event_in_db(event)
            
            # Check if we need to start a new window
            if (self.current_window is None or 
                current_time - self.window_start_time >= window_duration):
                # Save current window to history
                if self.current_window:
                    self.window_history.append(self.current_window)
                    self.recent_windows.append(self.current_window)
                    # Analyze for bursts
                    self._detect_bursts()
                
                # Start new window
                self.current_window = TimeWindow(current_time)
                self.window_start_time = current_time
            
            # Add event to current window
            self.current_window.add_event(event)
            
            # Update path statistics
            path_stats = self.path_statistics[event.path]
            if event.event_type in ['read', 'created']:
                path_stats['total_reads'] += 1
                path_stats['read_history'].append(current_time)
            elif event.event_type in ['write', 'modified', 'moved']:
                path_stats['total_writes'] += 1
                path_stats['write_history'].append(current_time)
                path_stats['total_modifications'] += 1
                path_stats['modification_history'].append(current_time)
            
            path_stats['last_accessed'] = current_time
            
            # Check thresholds for high-load classification
            self._check_thresholds(event.path, path_stats)
    
    def _check_thresholds(self, path: str, path_stats: Dict):
        """Check if path exceeds thresholds"""
        if self.current_window is None:
            return
        
        thresholds = self.config.thresholds
        
        # Check read frequency
        reads_in_window = self.current_window.file_reads.get(path, 0) + \
                         self.current_window.directory_reads.get(path, 0)
        
        # Check write frequency
        writes_in_window = self.current_window.file_writes.get(path, 0) + \
                          self.current_window.directory_writes.get(path, 0)
        
        # Check modification rate
        modifications_in_window = self.current_window.file_modifications.get(path, 0)
        
        # Mark as high-load if exceeds thresholds
        path_stats['is_high_load'] = (
            reads_in_window >= thresholds.read_frequency_threshold or
            writes_in_window >= thresholds.write_frequency_threshold or
            modifications_in_window >= thresholds.modification_rate_threshold
        )
    
    def _detect_bursts(self):
        """Detect bursty I/O behavior"""
        if len(self.recent_windows) < 2:
            return
        
        thresholds = self.config.thresholds
        multiplier = thresholds.burst_intensity_multiplier
        
        # Calculate average activity over recent windows
        recent_activity = []
        for window in list(self.recent_windows)[-thresholds.burst_time_window_seconds:]:
            recent_activity.append({
                'reads': window.read_count,
                'writes': window.write_count,
                'modifications': window.modification_count
            })
        
        if not recent_activity:
            return
        
        # Calculate averages
        avg_reads = sum(w['reads'] for w in recent_activity) / len(recent_activity)
        avg_writes = sum(w['writes'] for w in recent_activity) / len(recent_activity)
        avg_modifications = sum(w['modifications'] for w in recent_activity) / len(recent_activity)
        
        # Check current window for bursts
        if self.current_window:
            current = self.current_window
            
            # Detect burst if current activity is significantly above average
            burst_detected = (
                current.read_count >= avg_reads * multiplier or
                current.write_count >= avg_writes * multiplier or
                current.modification_count >= avg_modifications * multiplier
            )
            
            if burst_detected:
                # Mark all active paths in current window as burst
                all_paths = set(list(current.file_reads.keys()) + 
                               list(current.file_writes.keys()) +
                               list(current.directory_reads.keys()) +
                               list(current.directory_writes.keys()))
                
                for path in all_paths:
                    if path in self.path_statistics:
                        self.path_statistics[path]['is_burst'] = True
    
    def get_current_workload(self) -> dict:
        """Get current workload statistics for API/WebSocket"""
        with self.lock:
            if self.current_window:
                current_window_data = self.current_window.to_dict()
            else:
                current_window_data = {
                    "window_start": time.time(),
                    "read_count": 0,
                    "write_count": 0,
                    "modification_count": 0,
                    "file_reads": {},
                    "file_writes": {},
                    "file_modifications": {},
                    "directory_reads": {},
                    "directory_writes": {},
                    "total_events": 0,
                    "events": []
                }
            
            # Add explicit create/delete/rename counts based on current window events
            create_count = 0
            delete_count = 0
            rename_count = 0
            
            if self.current_window:
                for ev in self.current_window.events:
                    if ev.event_type == 'created':
                        create_count += 1
                    elif ev.event_type == 'deleted':
                        delete_count += 1
                    elif ev.event_type in ['moved', 'moved_to']:
                        rename_count += 1

            current_window_data['create_count'] = create_count
            current_window_data['delete_count'] = delete_count
            current_window_data['rename_count'] = rename_count
            
            # Get high-load and burst paths
            high_load_paths = [
                {
                    "path": path,
                    "stats": {
                        "total_reads": stats['total_reads'],
                        "total_writes": stats['total_writes'],
                        "total_modifications": stats['total_modifications'],
                        "is_high_load": stats['is_high_load'],
                        "is_burst": stats['is_burst'],
                        "last_accessed": stats['last_accessed']
                    }
                }
                for path, stats in self.path_statistics.items()
                if stats['is_high_load'] or stats['is_burst']
            ]
            
            # Get recent window history
            recent_history = [
                window.to_dict() 
                for window in list(self.window_history)[-10:]  # Last 10 windows
            ]
            
            return {
                "timestamp": time.time(),
                "current_window": current_window_data,
                "high_load_paths": high_load_paths,
                "recent_history": recent_history,
                "total_paths_monitored": len(self.path_statistics),
                "monitoring_active": self.running
            }
    
    def get_path_statistics(self, path: str) -> Optional[dict]:
        """Get detailed statistics for a specific path"""
        with self.lock:
            if path not in self.path_statistics:
                return None
            
            stats = self.path_statistics[path]
            return {
                "path": path,
                "total_reads": stats['total_reads'],
                "total_writes": stats['total_writes'],
                "total_modifications": stats['total_modifications'],
                "is_high_load": stats['is_high_load'],
                "is_burst": stats['is_burst'],
                "last_accessed": stats['last_accessed'],
                "read_frequency": len(stats['read_history']),
                "write_frequency": len(stats['write_history']),
                "modification_frequency": len(stats['modification_history'])
            }
    
    def get_window_history(self, limit: int = 100) -> List[dict]:
        """Get historical window data"""
        with self.lock:
            return [
                window.to_dict() 
                for window in list(self.window_history)[-limit:]
            ]
    
    def _store_event_in_db(self, event: IOEvent):
        """Store event in database for persistence"""
        try:
            import sqlite3
            from pathlib import Path as PathLib
            
            db_path = PathLib(__file__).parent / "san_monitor.db"
            conn = sqlite3.connect(str(db_path))
            cur = conn.cursor()
            
            # Ensure events table exists
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    path TEXT NOT NULL,
                    is_directory BOOLEAN NOT NULL,
                    timestamp REAL NOT NULL,
                    created_at REAL NOT NULL
                );
                """
            )
            
            # Insert event
            cur.execute(
                "INSERT INTO events (event_type, path, is_directory, timestamp, created_at) VALUES (?, ?, ?, ?, ?)",
                (event.event_type, event.path, event.is_directory, event.timestamp, time.time())
            )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error storing event in database: {e}")
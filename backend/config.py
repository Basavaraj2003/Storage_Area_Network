"""
Configuration management for SAN I/O Monitor
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Any
from pydantic import BaseModel, Field


class ThresholdConfig(BaseModel):
    """Threshold configuration for workload classification"""
    read_frequency_threshold: int = Field(default=100, description="Reads per time window to mark as high-load")
    write_frequency_threshold: int = Field(default=100, description="Writes per time window to mark as high-load")
    modification_rate_threshold: int = Field(default=50, description="Modifications per time window to mark as high-load")
    burst_intensity_multiplier: float = Field(default=3.0, description="Multiplier above average to detect burst")
    burst_time_window_seconds: int = Field(default=5, description="Time window in seconds for burst detection")


class Config:
    """Main configuration class"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self.san_paths: List[str] = []
        self.time_window_seconds: int = 1  # Default 1 second windows
        self.thresholds: ThresholdConfig = ThresholdConfig()
        self.enable_san_volume_detection: bool = True
        
        # Load configuration if exists
        if os.path.exists(config_path):
            self.load_config()
        else:
            # Create default configuration
            self.create_default_config()
    
    def create_default_config(self):
        """Create default configuration file"""
        default_config = {
            "san_paths": [
                # Add your SAN-mounted paths here
                # Example: "Z:\\", "Y:\\SAN_Storage"
            ],
            "time_window_seconds": 1,
            "thresholds": {
                "read_frequency_threshold": 100,
                "write_frequency_threshold": 100,
                "modification_rate_threshold": 50,
                "burst_intensity_multiplier": 3.0,
                "burst_time_window_seconds": 5
            },
            "enable_san_volume_detection": True
        }
        
        with open(self.config_path, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        self.san_paths = default_config["san_paths"]
        self.time_window_seconds = default_config["time_window_seconds"]
        self.thresholds = ThresholdConfig(**default_config["thresholds"])
    
    def load_config(self):
        """Load configuration from file"""
        with open(self.config_path, 'r') as f:
            config_data = json.load(f)
        
        self.san_paths = config_data.get("san_paths", [])
        self.time_window_seconds = config_data.get("time_window_seconds", 1)
        self.thresholds = ThresholdConfig(**config_data.get("thresholds", {}))
        self.enable_san_volume_detection = config_data.get("enable_san_volume_detection", True)
    
    def save_config(self):
        """Save current configuration to file"""
        config_data = {
            "san_paths": self.san_paths,
            "time_window_seconds": self.time_window_seconds,
            "thresholds": self.thresholds.dict(),
            "enable_san_volume_detection": self.enable_san_volume_detection
        }
        
        with open(self.config_path, 'w') as f:
            json.dump(config_data, f, indent=2)
    
    def add_san_path(self, path: str):
        """Add a SAN path to monitor"""
        if path not in self.san_paths:
            self.san_paths.append(path)
            self.save_config()
    
    def remove_san_path(self, path: str):
        """Remove a SAN path from monitoring"""
        if path in self.san_paths:
            self.san_paths.remove(path)
            self.save_config()
    
    def is_san_path(self, path: str) -> bool:
        """Check if a path is on a SAN-mounted volume"""
        if not self.enable_san_volume_detection:
            return True  # Monitor all paths if detection is disabled
        
        # Check if path starts with any configured SAN path
        for san_path in self.san_paths:
            if path.startswith(san_path):
                return True
        
        # Try to detect SAN volumes by checking drive type
        try:
            import psutil
            path_obj = Path(path)
            if path_obj.is_absolute():
                drive = path_obj.drive
                if drive:
                    # Check if it's a network drive or remote mount
                    partitions = psutil.disk_partitions()
                    for partition in partitions:
                        if partition.device.startswith(drive):
                            # Check if it's a network mount
                            if 'remote' in partition.opts.lower() or 'network' in partition.fstype.lower():
                                return True
                            # Check for common SAN protocols in mount point
                            if any(protocol in partition.mountpoint.lower() for protocol in ['iscsi', 'fc', 'san']):
                                return True
        except Exception:
            pass
        
        return False

"""
REST API endpoints for SAN I/O workload data
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel

from monitor import IOMonitor
from config import Config
from pathlib import Path
import sqlite3

router = APIRouter(prefix="/api", tags=["SAN I/O Monitor"])

# Global references (will be set by main.py)
monitor_instance: Optional[IOMonitor] = None
config_instance: Optional[Config] = None


def set_monitor(monitor: IOMonitor, config: Config):
    """Set the monitor and config instances"""
    global monitor_instance, config_instance
    monitor_instance = monitor
    config_instance = config


class WorkloadResponse(BaseModel):
    """Response model for workload data"""
    timestamp: float
    current_window: dict
    high_load_paths: List[dict]
    recent_history: List[dict]
    total_paths_monitored: int
    monitoring_active: bool


class PathStatisticsResponse(BaseModel):
    """Response model for path statistics"""
    path: str
    total_reads: int
    total_writes: int
    total_modifications: int
    is_high_load: bool
    is_burst: bool
    last_accessed: Optional[float]
    read_frequency: int
    write_frequency: int
    modification_frequency: int


@router.get("/workload", response_model=WorkloadResponse)
async def get_current_workload():
    """Get current I/O workload statistics"""
    if not monitor_instance:
        raise HTTPException(status_code=503, detail="Monitor not initialized")
    
    workload_data = monitor_instance.get_current_workload()
    return workload_data


@router.get("/workload/history")
async def get_workload_history(limit: int = Query(default=100, ge=1, le=1000)):
    """Get historical workload data"""
    if not monitor_instance:
        raise HTTPException(status_code=503, detail="Monitor not initialized")
    
    history = monitor_instance.get_window_history(limit)
    return {
        "history": history,
        "count": len(history)
    }


@router.get("/path/{path:path}", response_model=PathStatisticsResponse)
async def get_path_statistics(path: str):
    """Get detailed statistics for a specific path"""
    if not monitor_instance:
        raise HTTPException(status_code=503, detail="Monitor not initialized")
    
    stats = monitor_instance.get_path_statistics(path)
    if stats is None:
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")
    
    return stats


@router.get("/paths/high-load")
async def get_high_load_paths():
    """Get all paths currently marked as high-load or burst"""
    if not monitor_instance:
        raise HTTPException(status_code=503, detail="Monitor not initialized")
    
    workload_data = monitor_instance.get_current_workload()
    return {
        "high_load_paths": workload_data["high_load_paths"],
        "count": len(workload_data["high_load_paths"])
    }


@router.get("/config")
async def get_configuration():
    """Get current configuration"""
    if not config_instance:
        raise HTTPException(status_code=503, detail="Config not initialized")
    
    return {
        "san_paths": config_instance.san_paths,
        "time_window_seconds": config_instance.time_window_seconds,
        "thresholds": config_instance.thresholds.dict(),
        "enable_san_volume_detection": config_instance.enable_san_volume_detection
    }


@router.post("/config/san-path")
async def add_san_path(path: str):
    """Add a SAN path to monitor"""
    if not config_instance:
        raise HTTPException(status_code=503, detail="Config not initialized")
    
    from pathlib import Path as PathLib
    if not PathLib(path).exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {path}")
    
    config_instance.add_san_path(path)
    
    # Restart monitor if running
    if monitor_instance and monitor_instance.running:
        monitor_instance.stop()
        monitor_instance.start()
    
    return {"message": f"Added SAN path: {path}", "san_paths": config_instance.san_paths}


@router.delete("/config/san-path")
async def remove_san_path(path: str):
    """Remove a SAN path from monitoring"""
    if not config_instance:
        raise HTTPException(status_code=503, detail="Config not initialized")
    
    config_instance.remove_san_path(path)
    
    # Restart monitor if running
    if monitor_instance and monitor_instance.running:
        monitor_instance.stop()
        monitor_instance.start()
    
    return {"message": f"Removed SAN path: {path}", "san_paths": config_instance.san_paths}


@router.get("/stats/summary")
async def get_summary_stats():
    """Get summary statistics"""
    if not monitor_instance:
        raise HTTPException(status_code=503, detail="Monitor not initialized")
    
    workload_data = monitor_instance.get_current_workload()
    history = monitor_instance.get_window_history(100)
    
    # Calculate totals
    total_reads = sum(w.get('read_count', 0) for w in history)
    total_writes = sum(w.get('write_count', 0) for w in history)
    total_modifications = sum(w.get('modification_count', 0) for w in history)
    
    # Calculate averages
    if history:
        avg_reads = total_reads / len(history)
        avg_writes = total_writes / len(history)
        avg_modifications = total_modifications / len(history)
    else:
        avg_reads = avg_writes = avg_modifications = 0
    
    return {
        "summary": {
            "total_reads": total_reads,
            "total_writes": total_writes,
            "total_modifications": total_modifications,
            "average_reads_per_window": avg_reads,
            "average_writes_per_window": avg_writes,
            "average_modifications_per_window": avg_modifications,
            "high_load_paths_count": len(workload_data["high_load_paths"]),
            "total_paths_monitored": workload_data["total_paths_monitored"],
            "windows_analyzed": len(history)
        },
        "current_window": workload_data["current_window"]
    }


@router.get("/exists-users")
async def exists_users():
    """Return whether any users exist in the backend DB (first-run detection)."""
    try:
        db_path = Path(__file__).parent / "san_monitor.db"
        if not db_path.exists():
            return {"exists": False, "count": 0}

        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()

        # Check if users table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        if not cur.fetchone():
            return {"exists": False, "count": 0}

        cur.execute("SELECT COUNT(1) FROM users;")
        row = cur.fetchone()
        count = int(row[0]) if row and row[0] is not None else 0
        return {"exists": bool(count), "count": count}
    except Exception:
        return {"exists": False, "count": 0}
    finally:
        try:
            conn.close()
        except Exception:
            pass


# --- Simple auth endpoints for frontend (register / login / me) ---
import hashlib
import hmac
import base64
import time
import os
from fastapi import Header, Request

# Secret for signing simple tokens. If environment variable SAN_MON_SECRET is set, use it.
_SECRET = os.environ.get('SAN_MON_SECRET', 'san-monitor-secret-please-change')


def _get_db_path() -> Path:
    return Path(__file__).parent / "san_monitor.db"


def _ensure_users_table():
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            created_at REAL NOT NULL
        );
        """
    )
    conn.commit()
    conn.close()

def _ensure_events_table():
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
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
    # Create index for faster queries
    cur.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);")
    conn.commit()
    conn.close()


def _hash_password(password: str, salt: bytes = None) -> str:
    if salt is None:
        salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + "$" + dk.hex()


def _verify_password(stored: str, password: str) -> bool:
    try:
        salt_hex, hash_hex = stored.split('$', 1)
        salt = bytes.fromhex(salt_hex)
        dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


def _make_token(username: str, exp_seconds: int = 60 * 60 * 24 * 7) -> str:
    exp = int(time.time()) + int(exp_seconds)
    payload = f"{username}|{exp}"
    sig = hmac.new(_SECRET.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    token = base64.urlsafe_b64encode(f"{payload}|{sig}".encode('utf-8')).decode('utf-8')
    return token


def _parse_token(token: str):
    try:
        raw = base64.urlsafe_b64decode(token.encode('utf-8')).decode('utf-8')
        username, exp_s, sig = raw.rsplit('|', 2)
        payload = f"{username}|{exp_s}"
        expected = hmac.new(_SECRET.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        if int(exp_s) < int(time.time()):
            return None
        return username
    except Exception:
        return None


@router.post("/auth/register")
async def auth_register(request: Request):
    """Register a new user. Expects JSON with username, email, password."""
    body = await request.json()
    username = body.get('username')
    email = body.get('email', '')
    password = body.get('password')
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")

    _ensure_users_table()
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    try:
        print(f"[auth] register attempt for username={username}")
        cur.execute("SELECT COUNT(1) FROM users")
        row = cur.fetchone()
        # Allow registration always, but caller may choose to only show register on first-run
        pwd_hash = _hash_password(password)
        cur.execute(
            "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (username, email, pwd_hash, time.time())
        )
        conn.commit()
        token = _make_token(username)
        print(f"[auth] registered username={username}")
        return {"access_token": token, "username": username, "email": email}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="username already exists")
    finally:
        conn.close()


@router.post("/auth/login")
async def auth_login(request: Request):
    """Login with username/password. Returns access_token."""
    body = await request.json()
    username = body.get('username')
    password = body.get('password')
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")

    _ensure_users_table()
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    try:
        cur.execute("SELECT username, email, password_hash FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
        if not row:
            print(f"[auth] login failed: user not found username={username}")
            raise HTTPException(status_code=401, detail="invalid credentials")
        # row: (username, email, password_hash)
        stored_hash = row[2]
        # Log attempt (no sensitive data)
        print(f"[auth] login attempt username={username}")
        if not _verify_password(stored_hash, password):
            print(f"[auth] login failed: password mismatch for username={username}")
            raise HTTPException(status_code=401, detail="invalid credentials")
        token = _make_token(username)
        print(f"[auth] login success username={username}")
        return {"access_token": token, "username": username, "email": row[1]}
    finally:
        conn.close()


@router.get("/auth/me")
async def auth_me(authorization: str = Header(None)):
    """Return current user info based on Bearer token in Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="missing authorization header")
    if authorization.startswith('Bearer '):
        token = authorization.split(' ', 1)[1]
    else:
        token = authorization

    username = _parse_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="invalid or expired token")

    _ensure_users_table()
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    try:
        cur.execute("SELECT username, email, created_at FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="user not found")
        return {"username": row[0], "email": row[1], "created_at": row[2]}
    finally:
        conn.close()


# Event storage and retrieval endpoints
@router.post("/events/store")
async def store_event(request: Request):
    """Store an event in the database"""
    body = await request.json()
    event_type = body.get('event_type')
    path = body.get('path')
    is_directory = body.get('is_directory', False)
    timestamp = body.get('timestamp', time.time())
    
    if not event_type or not path:
        raise HTTPException(status_code=400, detail="event_type and path required")
    
    _ensure_events_table()
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO events (event_type, path, is_directory, timestamp, created_at) VALUES (?, ?, ?, ?, ?)",
            (event_type, path, is_directory, timestamp, time.time())
        )
        conn.commit()
        return {"success": True, "message": "Event stored"}
    finally:
        conn.close()


@router.get("/events")
async def get_events(
    event_type: str = None,
    limit: int = Query(default=1000, ge=1, le=10000),
    start_time: float = None,
    end_time: float = None
):
    """Get events from database with optional filtering"""
    _ensure_events_table()
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    
    try:
        query = "SELECT event_type, path, is_directory, timestamp FROM events WHERE 1=1"
        params = []
        
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
        
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time)
        
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        events = []
        for row in rows:
            events.append({
                "event_type": row[0],
                "path": row[1],
                "is_directory": bool(row[2]),
                "timestamp": row[3]
            })
        
        return {"events": events, "count": len(events)}
    finally:
        conn.close()


@router.delete("/events/cleanup")
async def cleanup_events(days: int = Query(default=10, ge=1, le=365)):
    """Delete events older than specified days"""
    _ensure_events_table()
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    
    try:
        cutoff_time = time.time() - (days * 24 * 60 * 60)
        cur.execute("DELETE FROM events WHERE timestamp < ?", (cutoff_time,))
        deleted_count = cur.rowcount
        conn.commit()
        return {"success": True, "deleted_count": deleted_count, "message": f"Deleted events older than {days} days"}
    finally:
        conn.close()


@router.get("/events/stats")
async def get_event_stats(
    start_time: float = None,
    end_time: float = None
):
    """Get event statistics"""
    _ensure_events_table()
    db_path = _get_db_path()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    
    try:
        query = "SELECT event_type, COUNT(*) FROM events WHERE 1=1"
        params = []
        
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time)
        
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time)
        
        query += " GROUP BY event_type"
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        stats = {}
        total = 0
        for row in rows:
            stats[row[0]] = row[1]
            total += row[1]
        
        # Calculate operation categories
        write_ops = stats.get('modified', 0) + stats.get('moved', 0) + stats.get('moved_to', 0)
        read_ops = stats.get('created', 0)  # Proxy for reads
        create_ops = stats.get('created', 0)
        delete_ops = stats.get('deleted', 0)
        
        return {
            "detailed_stats": stats,
            "operation_stats": {
                "write_operations": write_ops,
                "read_operations": read_ops,
                "create_operations": create_ops,
                "delete_operations": delete_ops,
                "total_events": total
            }
        }
    finally:
        conn.close()
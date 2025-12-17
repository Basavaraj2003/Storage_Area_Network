#!/usr/bin/env python3
"""
Database initialization script for SAN I/O Monitor
Creates the users table if it doesn't exist
"""
import sqlite3
from pathlib import Path
import sys

def init_database():
    """Initialize the database with required tables"""
    db_path = Path(__file__).parent / "san_monitor.db"
    
    try:
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT,
                password_hash TEXT NOT NULL,
                created_at REAL NOT NULL
            );
        """)
        
        # Create index on username for faster lookups
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        """)
        
        conn.commit()
        print(f"✅ Database initialized successfully at: {db_path}")
        
        # Check if any users exist
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]
        print(f"📊 Current user count: {user_count}")
        
        if user_count == 0:
            print("ℹ️  No users found. First user will need to register.")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
#!/usr/bin/env python3
"""
Test script to generate file system events for monitoring
"""
import os
import time
import random
import string
from pathlib import Path

def generate_random_filename():
    """Generate a random filename"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)) + '.txt'

def test_file_operations(test_path):
    """Generate various file operations for testing"""
    test_path = Path(test_path)
    
    if not test_path.exists():
        print(f"❌ Test path does not exist: {test_path}")
        return False
    
    print(f"🧪 Starting file operations test on: {test_path}")
    
    try:
        # Create test directory
        test_dir = test_path / "san_monitor_test"
        test_dir.mkdir(exist_ok=True)
        print(f"📁 Created test directory: {test_dir}")
        
        # Generate file operations
        for i in range(10):
            filename = generate_random_filename()
            filepath = test_dir / filename
            
            # CREATE operation
            print(f"📝 Creating file: {filepath}")
            with open(filepath, 'w') as f:
                f.write(f"Test file {i}\nTimestamp: {time.time()}\n")
            
            time.sleep(0.5)
            
            # READ operation
            print(f"📖 Reading file: {filepath}")
            with open(filepath, 'r') as f:
                content = f.read()
            
            time.sleep(0.5)
            
            # MODIFY operation
            print(f"✏️ Modifying file: {filepath}")
            with open(filepath, 'a') as f:
                f.write(f"Modified at: {time.time()}\n")
            
            time.sleep(0.5)
            
            # DELETE operation (for some files)
            if i % 3 == 0:
                print(f"🗑️ Deleting file: {filepath}")
                filepath.unlink()
            
            time.sleep(1)
        
        # Clean up remaining files
        print("🧹 Cleaning up remaining test files...")
        for file in test_dir.glob("*.txt"):
            file.unlink()
        
        test_dir.rmdir()
        print("✅ Test completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        test_path = sys.argv[1]
    else:
        test_path = "Z:\\"
    
    print(f"Testing file operations on: {test_path}")
    success = test_file_operations(test_path)
    sys.exit(0 if success else 1)
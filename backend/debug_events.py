#!/usr/bin/env python3
"""
Debug script to test if events are being detected
"""
import time
import os
from pathlib import Path

def test_direct_events():
    """Test direct file operations"""
    test_path = Path("Z:/debug_test.txt")
    
    print("Creating file...")
    with open(test_path, 'w') as f:
        f.write("test content")
    
    time.sleep(1)
    
    print("Modifying file...")
    with open(test_path, 'a') as f:
        f.write("\nmore content")
    
    time.sleep(1)
    
    print("Reading file...")
    with open(test_path, 'r') as f:
        content = f.read()
        print(f"Read: {len(content)} characters")
    
    time.sleep(1)
    
    print("Deleting file...")
    test_path.unlink()
    
    print("Test completed")

if __name__ == "__main__":
    test_direct_events()
import time
import requests
import os

file_path = r"Z:\simulate_test_file.txt"

# Create and write
with open(file_path, 'w', encoding='utf-8') as f:
    f.write('initial')

# Wait a bit
time.sleep(0.6)

# Append
with open(file_path, 'a', encoding='utf-8') as f:
    f.write('\nmore')

# Wait for monitor to pick up
time.sleep(1)

# Fetch logs and workload
try:
    logs = requests.get('http://127.0.0.1:8001/api/audit/logs?limit=20').json()
    workload = requests.get('http://127.0.0.1:8001/api/workload').json()
    print('---LOGS---')
    print(logs)
    print('---WORKLOAD---')
    print(workload)
except Exception as e:
    print('API call failed:', e)

print('Done')

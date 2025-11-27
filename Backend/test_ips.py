#!/usr/bin/env python3
"""
Test both localhost and machine IP access
"""

import urllib.request
import json

def test_both_ips():
    """Test if backend is accessible on both IPs"""
    ips_to_test = [
        ("127.0.0.1:8000", "localhost"),
        ("10.238.12.148:8000", "machine IP")
    ]
    
    print("🔍 Testing backend accessibility...")
    print("=" * 50)
    
    for ip, name in ips_to_test:
        try:
            response = urllib.request.urlopen(f"http://{ip}/", timeout=5)
            data = json.loads(response.read().decode())
            print(f"✅ {name} ({ip}): WORKING")
            print(f"   Response: {data.get('message', 'N/A')}")
        except Exception as e:
            print(f"❌ {name} ({ip}): FAILED - {e}")
    
    print("\n🛠️ If machine IP fails:")
    print("1. Stop the current backend (Ctrl+C)")
    print("2. Restart with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("3. Test again")

if __name__ == "__main__":
    test_both_ips()

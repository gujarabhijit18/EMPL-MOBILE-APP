#!/usr/bin/env python3
"""
Simple backend test without requests dependency
"""

import urllib.request
import json

def test_backend():
    """Test if backend is running"""
    try:
        print("🔍 Testing backend connection...")
        response = urllib.request.urlopen("http://127.0.0.1:8000/", timeout=5)
        data = json.loads(response.read().decode())
        print("✅ Backend is running!")
        print(f"   Response: {data}")
        return True
    except urllib.error.URLError as e:
        print(f"❌ Backend not accessible: {e}")
        print("\n🛠️ Solutions:")
        print("1. Start the backend server:")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print("2. Check if port 8000 is blocked")
        print("3. Make sure you're in the Backend directory")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_backend()

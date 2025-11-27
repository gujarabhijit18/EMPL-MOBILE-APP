#!/usr/bin/env python3
"""
Port Verification Script
Verifies that Expo is on port 8081 and Backend on port 8000
"""

import urllib.request
import json

def check_ports():
    """Check if services are running on expected ports"""
    
    print("🔍 Port Verification")
    print("=" * 40)
    
    # Check Backend (port 8000)
    try:
        response = urllib.request.urlopen("http://127.0.0.1:8000/", timeout=5)
        data = json.loads(response.read().decode())
        print(f"✅ Backend (port 8000): Working")
        print(f"   {data.get('message', 'Unknown')}")
        backend_ok = True
    except Exception as e:
        print(f"❌ Backend (port 8000): {e}")
        backend_ok = False
    
    # Check Backend mobile access
    try:
        response = urllib.request.urlopen("http://10.238.12.148:8000/", timeout=5)
        data = json.loads(response.read().decode())
        print(f"✅ Backend Mobile (port 8000): Working")
        backend_mobile_ok = True
    except Exception as e:
        print(f"❌ Backend Mobile (port 8000): {e}")
        backend_mobile_ok = False
    
    # Check Expo Web (port 8081)
    try:
        response = urllib.request.urlopen("http://127.0.0.1:8081/", timeout=5)
        print(f"✅ Expo Web (port 8081): Working")
        expo_web_ok = True
    except Exception as e:
        print(f"❌ Expo Web (port 8081): {e}")
        expo_web_ok = False
    
    print(f"\n📋 Port Summary:")
    print(f"   Backend (8000): {'✅' if backend_ok else '❌'}")
    print(f"   Backend Mobile (8000): {'✅' if backend_mobile_ok else '❌'}")
    print(f"   Expo Web (8081): {'✅' if expo_web_ok else '❌'}")
    
    print(f"\n🎯 Expected URLs:")
    print(f"   Expo Web: http://127.0.0.1:8081")
    print(f"   Expo Mobile: exp://10.238.12.148:8081")
    print(f"   Backend API: http://127.0.0.1:8000")
    print(f"   Backend Mobile: http://10.238.12.148:8000")
    
    if backend_ok and backend_mobile_ok and expo_web_ok:
        print(f"\n🎉 All services running correctly!")
    elif backend_ok and not backend_mobile_ok:
        print(f"\n⚠️ Backend needs --host 0.0.0.0 for mobile access")
        print(f"   Run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    elif not backend_ok:
        print(f"\n❌ Backend not running")
        print(f"   Run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    elif not expo_web_ok:
        print(f"\n❌ Expo not running")
        print(f"   Run: cd Frontend && expo start")

if __name__ == "__main__":
    check_ports()

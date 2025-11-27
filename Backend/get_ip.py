#!/usr/bin/env python3
"""
IP Detection Utility for Expo Development
Helps you find your machine's IP address for mobile development
"""

import socket
import subprocess
import platform

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Create a socket to get the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def get_expo_ip():
    """Get IP address that Expo is using"""
    try:
        # Try to get the IP that Expo would use
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        return ip
    except Exception:
        return get_local_ip()

def main():
    print("🔍 IP Detection for Expo Development")
    print("=" * 40)
    
    local_ip = get_local_ip()
    expo_ip = get_expo_ip()
    
    print(f"🌐 Local IP: {local_ip}")
    print(f"📱 Expo IP: {expo_ip}")
    
    print(f"\n📋 Update your frontend API configuration:")
    print(f"   For mobile: http://{local_ip}:8000")
    print(f"   For web: http://127.0.0.1:8000")
    
    print(f"\n🎯 Current Expo URL format: exp://{local_ip}:8081")
    print(f"🔧 Backend should run on: http://0.0.0.0:8000")
    
    print(f"\n📱 Test your connection:")
    print(f"   1. Start backend: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print(f"   2. Test in browser: http://{local_ip}:8000")
    print(f"   3. Update frontend if needed")
    
    # Test if backend is accessible
    try:
        import requests
        response = requests.get(f"http://{local_ip}:8000/", timeout=2)
        if response.status_code == 200:
            print(f"✅ Backend is accessible on http://{local_ip}:8000")
        else:
            print(f"❌ Backend not responding on http://{local_ip}:8000")
    except ImportError:
        print(f"⚠️ Install requests to test backend: pip install requests")
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")

if __name__ == "__main__":
    main()

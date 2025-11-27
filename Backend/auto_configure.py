#!/usr/bin/env python3
"""
Auto-configure API IP for Expo Development
This script automatically updates the frontend configuration with your current IP
"""

import os
import re
import socket

def get_local_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def update_api_config(ip):
    """Update the API configuration file with new IP"""
    config_path = "../Frontend/src/config/api.ts"
    
    try:
        with open(config_path, 'r') as f:
            content = f.read()
        
        # Update the MACHINE_IP line
        new_content = re.sub(
            r'MACHINE_IP: "[\d\.]+"',
            f'MACHINE_IP: "{ip}"',
            content
        )
        
        with open(config_path, 'w') as f:
            f.write(new_content)
        
        print(f"✅ Updated API configuration with IP: {ip}")
        return True
    except Exception as e:
        print(f"❌ Failed to update config: {e}")
        return False

def main():
    print("🔧 Auto-configure API IP for Expo Development")
    print("=" * 50)
    
    # Get current IP
    current_ip = get_local_ip()
    print(f"🌐 Detected IP: {current_ip}")
    
    # Update configuration
    if update_api_config(current_ip):
        print(f"✅ Configuration updated successfully!")
        print(f"\n📋 Next steps:")
        print(f"1. Start backend: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print(f"2. Start frontend: expo start")
        print(f"3. Test connection")
        print(f"\n🎯 URLs:")
        print(f"   Web: http://127.0.0.1:8000")
        print(f"   Mobile: http://{current_ip}:8000")
        print(f"   Expo: exp://{current_ip}:8081")
    else:
        print(f"❌ Configuration update failed")
        print(f"Please manually update Frontend/src/config/api.ts")

if __name__ == "__main__":
    main()

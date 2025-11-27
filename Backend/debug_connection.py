#!/usr/bin/env python3
"""
Simple backend connection test for debugging
"""

import requests
import json
import time

def test_backend_connection():
    """Test if backend is accessible from different URLs"""
    
    urls_to_test = [
        "http://127.0.0.1:8000",
        "http://localhost:8000", 
        "http://10.0.2.2:8000",  # Android emulator
    ]
    
    print("🔍 Testing Backend Connection")
    print("=" * 40)
    
    for url in urls_to_test:
        try:
            print(f"\n📡 Testing: {url}")
            response = requests.get(f"{url}/", timeout=5)
            
            if response.status_code == 200:
                print(f"✅ SUCCESS: {url} is accessible")
                print(f"   Response: {response.json()}")
                
                # Test CORS endpoint
                try:
                    cors_response = requests.get(f"{url}/test-cors", timeout=5)
                    if cors_response.status_code == 200:
                        print(f"✅ CORS working on {url}")
                    else:
                        print(f"❌ CORS failed on {url}: {cors_response.status_code}")
                except Exception as e:
                    print(f"❌ CORS error on {url}: {e}")
                    
                return url  # Return working URL
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Connection failed: {url}")
        except requests.exceptions.Timeout:
            print(f"❌ Timeout: {url}")
        except Exception as e:
            print(f"❌ Error: {url} - {e}")
    
    print(f"\n❌ No working backend URL found!")
    return None

def test_auth_endpoints(base_url):
    """Test authentication endpoints"""
    
    print(f"\n🔐 Testing Authentication on {base_url}")
    print("=" * 40)
    
    # Test send OTP
    try:
        print("📧 Testing Send OTP...")
        response = requests.post(f"{base_url}/auth/send-otp", 
                               data={"email": "admin@company.com"}, 
                               timeout=5)
        
        if response.status_code == 200:
            print("✅ Send OTP successful")
            result = response.json()
            print(f"   Environment: {result.get('environment')}")
            print(f"   Method: {result.get('otp_method')}")
            return True
        else:
            print(f"❌ Send OTP failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Send OTP error: {e}")
        return False

def main():
    print("🚀 Backend Connection Debugger")
    print("=" * 50)
    
    # Test connection
    working_url = test_backend_connection()
    
    if not working_url:
        print("\n🛠️ Troubleshooting Steps:")
        print("1. Make sure backend is running: uvicorn app.main:app --reload --port 8000")
        print("2. Check if port 8000 is blocked by firewall")
        print("3. Try running backend with --host 0.0.0.0")
        print("4. For Android emulator, use: http://10.0.2.2:8000")
        print("5. For web/testing, use: http://127.0.0.1:8000")
        return
    
    # Test authentication
    if test_auth_endpoints(working_url):
        print(f"\n✅ Backend is ready! Use URL: {working_url}")
        print("\n📱 Update your frontend API_BASE_URL to:")
        print(f"   const API_BASE_URL = \"{working_url}\";")
    else:
        print("\n❌ Authentication endpoints not working properly")

if __name__ == "__main__":
    main()

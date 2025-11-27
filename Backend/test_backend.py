#!/usr/bin/env python3
"""
Test script to verify backend authentication endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_connection():
    """Test basic connection to backend"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ Backend connection successful")
            return True
        else:
            print(f"❌ Backend connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection error: {e}")
        return False

def test_cors():
    """Test CORS endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/test-cors")
        if response.status_code == 200:
            print("✅ CORS test successful")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ CORS test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ CORS test error: {e}")
        return False

def test_send_otp():
    """Test send OTP endpoint"""
    test_email = "admin@company.com"
    
    try:
        response = requests.post(f"{BASE_URL}/auth/send-otp", data={"email": test_email})
        if response.status_code == 200:
            print("✅ Send OTP successful")
            result = response.json()
            print(f"   Environment: {result.get('environment')}")
            print(f"   Method: {result.get('otp_method')}")
            print(f"   Message: {result.get('message')}")
            return True
        else:
            print(f"❌ Send OTP failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Send OTP error: {e}")
        return False

def test_verify_otp():
    """Test verify OTP endpoint"""
    test_email = "admin@company.com"
    test_otp = "123456"  # Testing OTP
    
    try:
        response = requests.post(f"{BASE_URL}/auth/verify-otp", data={
            "email": test_email, 
            "otp": test_otp
        })
        
        if response.status_code == 200:
            print("✅ Verify OTP successful")
            result = response.json()
            print(f"   User: {result.get('name')} ({result.get('role')})")
            print(f"   Token: {result.get('access_token')[:20]}...")
            return True
        else:
            print(f"❌ Verify OTP failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Verify OTP error: {e}")
        return False

def main():
    print("🔧 Testing Backend Authentication Endpoints")
    print("=" * 50)
    
    # Test basic connection
    if not test_connection():
        print("\n❌ Backend is not running. Please start it first:")
        print("   cd Backend && uvicorn app.main:app --reload --port 8000")
        return
    
    print()
    
    # Test CORS
    test_cors()
    print()
    
    # Test send OTP
    test_send_otp()
    print()
    
    # Test verify OTP
    test_verify_otp()
    print()
    
    print("🎉 Backend testing completed!")
    print("\n📋 Next Steps:")
    print("1. Make sure test users exist in database")
    print("2. Run: python create_test_users.py")
    print("3. Start frontend: expo start")
    print("4. Use test emails to login")

if __name__ == "__main__":
    main()

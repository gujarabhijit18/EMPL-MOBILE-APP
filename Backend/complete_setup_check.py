#!/usr/bin/env python3
"""
Complete API Integration Setup Script
This script verifies and sets up the entire API integration
"""

import os
import sys
import subprocess
import urllib.request
import json

def print_section(title):
    print(f"\n{'='*60}")
    print(f"🔧 {title}")
    print('='*60)

def check_backend_running():
    """Check if backend is accessible"""
    try:
        response = urllib.request.urlopen("http://127.0.0.1:8000/", timeout=5)
        data = json.loads(response.read().decode())
        return True, data.get('message', 'Unknown')
    except Exception as e:
        return False, str(e)

def check_mobile_backend():
    """Check if backend is accessible from mobile IP"""
    try:
        response = urllib.request.urlopen("http://10.238.12.148:8000/", timeout=5)
        data = json.loads(response.read().decode())
        return True, data.get('message', 'Unknown')
    except Exception as e:
        return False, str(e)

def check_auth_endpoints():
    """Test authentication endpoints"""
    results = {}
    
    # Test send OTP
    try:
        data = urllib.parse.urlencode({'email': 'admin@company.com'}).encode()
        req = urllib.request.Request("http://127.0.0.1:8000/auth/send-otp", data=data)
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        response = urllib.request.urlopen(req, timeout=5)
        result = json.loads(response.read().decode())
        results['send_otp'] = True
        results['send_otp_response'] = result
    except Exception as e:
        results['send_otp'] = False
        results['send_otp_error'] = str(e)
    
    return results

def check_frontend_files():
    """Check if frontend API files exist"""
    frontend_path = "../Frontend/src"
    required_files = [
        "lib/api.ts",
        "config/api.ts", 
        "screens/Login.tsx",
        "contexts/AuthContext.tsx"
    ]
    
    results = {}
    for file_path in required_files:
        full_path = os.path.join(frontend_path, file_path)
        results[file_path] = os.path.exists(full_path)
    
    return results

def check_backend_files():
    """Check if backend API files exist"""
    backend_path = "."
    required_files = [
        "app/main.py",
        "app/routes/auth_routes.py",
        "app/routes/user_routes.py",
        "app/routes/dashboard_routes.py"
    ]
    
    results = {}
    for file_path in required_files:
        full_path = os.path.join(backend_path, file_path)
        results[file_path] = os.path.exists(full_path)
    
    return results

def main():
    print_section("🚀 COMPLETE API INTEGRATION SETUP")
    
    # Check backend files
    print_section("📁 Backend Files Check")
    backend_files = check_backend_files()
    all_backend_files_exist = True
    for file_path, exists in backend_files.items():
        status = "✅" if exists else "❌"
        print(f"{status} {file_path}")
        if not exists:
            all_backend_files_exist = False
    
    # Check frontend files
    print_section("📱 Frontend Files Check")
    frontend_files = check_frontend_files()
    all_frontend_files_exist = True
    for file_path, exists in frontend_files.items():
        status = "✅" if exists else "❌"
        print(f"{status} {file_path}")
        if not exists:
            all_frontend_files_exist = False
    
    # Check backend connectivity
    print_section("🌐 Backend Connectivity Check")
    localhost_ok, localhost_msg = check_backend_running()
    mobile_ok, mobile_msg = check_mobile_backend()
    
    print(f"{'✅' if localhost_ok else '❌'} Localhost (127.0.0.1:8000): {localhost_msg}")
    print(f"{'✅' if mobile_ok else '❌'} Mobile IP (10.238.12.148:8000): {mobile_msg}")
    
    # Check authentication endpoints
    print_section("🔐 Authentication Endpoints Check")
    auth_results = check_auth_endpoints()
    
    print(f"{'✅' if auth_results.get('send_otp') else '❌'} Send OTP Endpoint")
    if auth_results.get('send_otp'):
        result = auth_results.get('send_otp_response', {})
        print(f"   Environment: {result.get('environment', 'N/A')}")
        print(f"   Method: {result.get('otp_method', 'N/A')}")
    else:
        print(f"   Error: {auth_results.get('send_otp_error', 'Unknown')}")
    
    # Summary
    print_section("📊 SETUP SUMMARY")
    
    issues = []
    if not all_backend_files_exist:
        issues.append("❌ Missing backend files")
    if not all_frontend_files_exist:
        issues.append("❌ Missing frontend files")
    if not localhost_ok:
        issues.append("❌ Backend not running on localhost")
    if not mobile_ok:
        issues.append("❌ Backend not accessible from mobile IP")
    if not auth_results.get('send_otp'):
        issues.append("❌ Authentication endpoints not working")
    
    if not issues:
        print("🎉 ALL SYSTEMS GO! API Integration is Complete")
        print("\n📋 Next Steps:")
        print("1. Start backend: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        print("2. Create test users: python create_test_users.py")
        print("3. Start frontend: cd Frontend && expo start")
        print("4. Test login with: admin@company.com")
    else:
        print("⚠️ Issues Found:")
        for issue in issues:
            print(f"   {issue}")
        
        print("\n🛠️ Quick Fixes:")
        if not mobile_ok:
            print("• Restart backend with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        if not auth_results.get('send_otp'):
            print("• Create test users: python create_test_users.py")
        if not all_frontend_files_exist:
            print("• Check frontend API files exist")

if __name__ == "__main__":
    main()

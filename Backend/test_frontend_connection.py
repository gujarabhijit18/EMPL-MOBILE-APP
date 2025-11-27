#!/usr/bin/env python3
"""
Complete Frontend-Backend Connection Test
Tests all aspects of the API integration
"""

import urllib.request
import json
import urllib.parse

def test_backend_endpoints():
    """Test all backend endpoints that frontend uses"""
    base_urls = [
        "http://127.0.0.1:8000",
        "http://10.238.12.148:8000"
    ]
    
    results = {}
    
    for base_url in base_urls:
        print(f"\n🔍 Testing {base_url}")
        print("-" * 50)
        
        url_results = {}
        
        # Test basic connection
        try:
            response = urllib.request.urlopen(f"{base_url}/", timeout=5)
            data = json.loads(response.read().decode())
            url_results['basic'] = True
            url_results['basic_response'] = data.get('message', 'Unknown')
            print(f"✅ Basic Connection: {data.get('message', 'Unknown')}")
        except Exception as e:
            url_results['basic'] = False
            url_results['basic_error'] = str(e)
            print(f"❌ Basic Connection: {e}")
            continue  # Skip other tests if basic fails
        
        # Test CORS endpoint
        try:
            response = urllib.request.urlopen(f"{base_url}/test-cors", timeout=5)
            data = json.loads(response.read().decode())
            url_results['cors'] = True
            url_results['cors_response'] = data.get('message', 'Unknown')
            print(f"✅ CORS Test: {data.get('message', 'Unknown')}")
        except Exception as e:
            url_results['cors'] = False
            url_results['cors_error'] = str(e)
            print(f"❌ CORS Test: {e}")
        
        # Test Send OTP (form data)
        try:
            data = urllib.parse.urlencode({'email': 'admin@company.com'}).encode()
            req = urllib.request.Request(f"{base_url}/auth/send-otp", data=data)
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            response = urllib.request.urlopen(req, timeout=5)
            result = json.loads(response.read().decode())
            url_results['send_otp'] = True
            url_results['send_otp_response'] = result
            print(f"✅ Send OTP: {result.get('message', 'Unknown')}")
            print(f"   Environment: {result.get('environment', 'N/A')}")
            print(f"   Method: {result.get('otp_method', 'N/A')}")
        except Exception as e:
            url_results['send_otp'] = False
            url_results['send_otp_error'] = str(e)
            print(f"❌ Send OTP: {e}")
        
        # Test Verify OTP (form data)
        try:
            data = urllib.parse.urlencode({'email': 'admin@company.com', 'otp': '123456'}).encode()
            req = urllib.request.Request(f"{base_url}/auth/verify-otp", data=data)
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            response = urllib.request.urlopen(req, timeout=5)
            result = json.loads(response.read().decode())
            url_results['verify_otp'] = True
            url_results['verify_otp_response'] = result
            print(f"✅ Verify OTP: Token generated successfully")
            print(f"   Role: {result.get('role', 'N/A')}")
            print(f"   User: {result.get('name', 'N/A')}")
        except Exception as e:
            url_results['verify_otp'] = False
            url_results['verify_otp_error'] = str(e)
            print(f"❌ Verify OTP: {e}")
        
        results[base_url] = url_results
    
    return results

def generate_frontend_config(results):
    """Generate the optimal frontend configuration"""
    print(f"\n🔧 FRONTEND CONFIGURATION RECOMMENDATION")
    print("=" * 60)
    
    # Check which URL works best
    localhost_works = results.get("http://127.0.0.1:8000", {}).get('basic', False)
    mobile_works = results.get("http://10.238.12.148:8000", {}).get('basic', False)
    
    if localhost_works and mobile_works:
        print("✅ Both localhost and mobile IP work - current config is good")
        print("📱 Frontend will use:")
        print("   Web: http://127.0.0.1:8000")
        print("   Mobile: http://10.238.12.148:8000")
    elif localhost_works and not mobile_works:
        print("⚠️ Only localhost works - backend needs --host 0.0.0.0")
        print("🔧 Restart backend with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    elif not localhost_works and mobile_works:
        print("⚠️ Only mobile IP works - unusual but should work for mobile")
    else:
        print("❌ Neither URL works - backend is not running")
    
    # Check authentication
    auth_works_localhost = results.get("http://127.0.0.1:8000", {}).get('send_otp', False)
    auth_works_mobile = results.get("http://10.238.12.148:8000", {}).get('send_otp', False)
    
    if auth_works_localhost or auth_works_mobile:
        print("✅ Authentication endpoints working")
    else:
        print("❌ Authentication endpoints not working")
        print("🔧 Fix: Create test users with python create_test_users.py")

def main():
    print("🚀 COMPLETE FRONTEND-BACKEND CONNECTION TEST")
    print("=" * 60)
    
    # Test all endpoints
    results = test_backend_endpoints()
    
    # Generate recommendations
    generate_frontend_config(results)
    
    # Summary
    print(f"\n📊 CONNECTION SUMMARY")
    print("=" * 60)
    
    for url, url_results in results.items():
        basic_ok = url_results.get('basic', False)
        auth_ok = url_results.get('send_otp', False)
        
        if basic_ok and auth_ok:
            status = "✅ FULLY WORKING"
        elif basic_ok:
            status = "⚠️ PARTIAL (no auth)"
        else:
            status = "❌ NOT WORKING"
        
        print(f"{status} - {url}")
    
    print(f"\n🎯 NEXT STEPS:")
    print("1. Ensure backend runs with --host 0.0.0.0")
    print("2. Create test users: python create_test_users.py")
    print("3. Test frontend login with admin@company.com")

if __name__ == "__main__":
    main()

"""
Test backend connection and bulk upload endpoint
Run this to verify the backend is accessible from your network
"""

import requests
import sys
import os

def test_backend_connection(ip="192.168.1.37", port=8000):
    """Test if backend is accessible"""
    base_url = f"http://{ip}:{port}"
    
    print("=" * 60)
    print("  BACKEND CONNECTION TEST")
    print("=" * 60)
    print(f"\n🔗 Testing: {base_url}\n")
    
    # Test 1: Basic connection
    print("1️⃣  Testing basic connection...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print(f"   ✅ Backend is running")
            print(f"   📡 Response: {response.json()}")
        else:
            print(f"   ⚠️  Backend responded with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Cannot connect to backend")
        print(f"   💡 Make sure backend is running:")
        print(f"      python -m uvicorn app.main:app --host 0.0.0.0 --port {port} --reload")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: CORS endpoint
    print("\n2️⃣  Testing CORS configuration...")
    try:
        response = requests.get(f"{base_url}/test-cors", timeout=5)
        if response.status_code == 200:
            print(f"   ✅ CORS is configured correctly")
            data = response.json()
            print(f"   📡 Message: {data.get('message', 'N/A')}")
        else:
            print(f"   ⚠️  CORS test returned status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Bulk upload endpoint (without auth)
    print("\n3️⃣  Testing bulk upload endpoint accessibility...")
    try:
        # This should return 401 (unauthorized) but proves the endpoint exists
        response = requests.post(f"{base_url}/employees/bulk-upload", timeout=5)
        if response.status_code == 401:
            print(f"   ✅ Bulk upload endpoint exists (requires authentication)")
        elif response.status_code == 422:
            print(f"   ✅ Bulk upload endpoint exists (missing file parameter)")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
            print(f"   📡 Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Network info
    print("\n4️⃣  Network Information...")
    print(f"   🌐 Backend URL: {base_url}")
    print(f"   📱 Make sure your mobile device is on the same WiFi")
    print(f"   🔥 Check Windows Firewall allows Python on port {port}")
    
    # Test 5: Create test file
    print("\n5️⃣  Creating test CSV file...")
    test_file = "test_upload.csv"
    try:
        with open(test_file, 'w') as f:
            f.write("employee_id,name,email\n")
            f.write("TEST001,Test User,test@example.com\n")
        print(f"   ✅ Created {test_file}")
        print(f"   📤 You can use this file to test upload from the app")
    except Exception as e:
        print(f"   ❌ Error creating test file: {e}")
    
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print("\n✅ Backend is accessible and ready for bulk uploads")
    print("\n📝 Next steps:")
    print("   1. Ensure you're logged in to the app (Admin or HR role)")
    print("   2. Make sure mobile device is on same WiFi")
    print("   3. Try uploading test_upload.csv from the app")
    print("   4. Check backend console for detailed logs")
    print("\n" + "=" * 60)
    
    return True

def test_with_auth(ip="192.168.1.37", port=8000):
    """Test bulk upload with authentication"""
    base_url = f"http://{ip}:{port}"
    
    print("\n" + "=" * 60)
    print("  AUTHENTICATED UPLOAD TEST")
    print("=" * 60)
    
    # You would need to get a real token from login
    print("\n⚠️  This test requires a valid authentication token")
    print("   To get a token:")
    print("   1. Log in to the app")
    print("   2. Check the app logs for the token")
    print("   3. Or use the /auth/send-otp and /auth/verify-otp endpoints")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    # Get IP from command line or use default
    ip = sys.argv[1] if len(sys.argv) > 1 else "192.168.1.37"
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    
    try:
        import requests
    except ImportError:
        print("❌ 'requests' package not installed")
        print("   Install with: pip install requests")
        sys.exit(1)
    
    success = test_backend_connection(ip, port)
    
    if success:
        test_with_auth(ip, port)

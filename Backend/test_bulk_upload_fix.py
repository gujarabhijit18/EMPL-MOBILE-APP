"""
Test script to verify bulk upload dependencies and configuration
Run this to ensure everything is set up correctly for bulk uploads
"""

import sys
import os

def test_dependencies():
    """Test if required packages are installed"""
    print("🔍 Checking dependencies...\n")
    
    dependencies = {
        'pandas': 'Excel file processing',
        'openpyxl': 'Excel .xlsx file support',
        'PyPDF2': 'PDF file processing',
        'fastapi': 'Web framework',
        'uvicorn': 'ASGI server',
    }
    
    missing = []
    installed = []
    
    for package, purpose in dependencies.items():
        try:
            __import__(package)
            installed.append(f"✅ {package:15} - {purpose}")
        except ImportError:
            missing.append(f"❌ {package:15} - {purpose}")
    
    print("Installed packages:")
    for item in installed:
        print(f"  {item}")
    
    if missing:
        print("\n⚠️  Missing packages:")
        for item in missing:
            print(f"  {item}")
        print("\n📦 Install missing packages:")
        print("   pip install pandas openpyxl PyPDF2")
        return False
    else:
        print("\n✅ All dependencies installed!")
        return True

def test_directories():
    """Test if required directories exist"""
    print("\n🔍 Checking directories...\n")
    
    directories = [
        'static',
        'static/profile_photos',
        'static/selfies',
    ]
    
    all_exist = True
    for directory in directories:
        if os.path.exists(directory):
            print(f"  ✅ {directory}")
        else:
            print(f"  ❌ {directory} (will be created automatically)")
            all_exist = False
    
    return all_exist

def test_backend_running():
    """Test if backend is accessible"""
    print("\n🔍 Checking backend server...\n")
    
    try:
        import requests
        response = requests.get('http://localhost:8000/test-cors', timeout=2)
        if response.status_code == 200:
            print("  ✅ Backend is running and accessible")
            print(f"  📡 Response: {response.json()['message']}")
            return True
        else:
            print(f"  ⚠️  Backend responded with status {response.status_code}")
            return False
    except ImportError:
        print("  ⚠️  'requests' package not installed (optional for this test)")
        print("     Install with: pip install requests")
        return None
    except Exception as e:
        print(f"  ❌ Backend not accessible: {e}")
        print("     Start backend with: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
        return False

def test_sample_csv():
    """Create a sample CSV file for testing"""
    print("\n🔍 Creating sample test file...\n")
    
    sample_csv = """employee_id,name,email,department,designation,role
EMP001,John Doe,john@example.com,Engineering,Software Engineer,EMPLOYEE
EMP002,Jane Smith,jane@example.com,HR,HR Manager,HR
EMP003,Bob Johnson,bob@example.com,Marketing,Marketing Lead,EMPLOYEE"""
    
    try:
        with open('sample_bulk_upload.csv', 'w') as f:
            f.write(sample_csv)
        print("  ✅ Created sample_bulk_upload.csv")
        print("     Use this file to test bulk upload functionality")
        return True
    except Exception as e:
        print(f"  ❌ Failed to create sample file: {e}")
        return False

def main():
    print("=" * 60)
    print("  BULK UPLOAD CONFIGURATION TEST")
    print("=" * 60)
    
    results = {
        'dependencies': test_dependencies(),
        'directories': test_directories(),
        'backend': test_backend_running(),
        'sample': test_sample_csv(),
    }
    
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    
    if results['dependencies']:
        print("✅ All required packages installed")
    else:
        print("❌ Some packages are missing - install them first")
    
    if results['directories']:
        print("✅ All directories exist")
    else:
        print("⚠️  Some directories missing (will be auto-created)")
    
    if results['backend'] is True:
        print("✅ Backend server is running")
    elif results['backend'] is False:
        print("❌ Backend server is not running - start it first")
    else:
        print("⚠️  Could not test backend (requests package missing)")
    
    if results['sample']:
        print("✅ Sample CSV file created")
    
    print("\n" + "=" * 60)
    
    if results['dependencies'] and (results['backend'] is True or results['backend'] is None):
        print("🎉 System is ready for bulk uploads!")
        print("\n📝 Next steps:")
        print("   1. Ensure backend is running")
        print("   2. Update IP in Frontend/src/config/api.ts")
        print("   3. Test with sample_bulk_upload.csv")
    else:
        print("⚠️  Please fix the issues above before testing bulk uploads")
    
    print("=" * 60)

if __name__ == "__main__":
    main()

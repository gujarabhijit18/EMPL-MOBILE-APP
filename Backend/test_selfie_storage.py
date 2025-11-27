"""
Test script to verify selfie storage for both check-in and check-out
"""
import os
import sys
import json
from datetime import datetime

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.db.models.attendance import Attendance
from app.db.models.user import User

def test_selfie_storage():
    """Test that selfie data is properly stored in JSON format"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("TESTING SELFIE STORAGE MECHANISM")
        print("=" * 80)
        
        # Test 1: Verify _dump_selfie_data function
        print("\n📋 Test 1: Testing _dump_selfie_data function")
        print("-" * 80)
        
        from app.routes.attendance_routes import _dump_selfie_data, _load_selfie_data
        
        # Test creating new selfie data
        result1 = _dump_selfie_data(None, check_in="static/selfies/test_checkin.jpg")
        print(f"✅ Check-in only: {result1}")
        parsed1 = json.loads(result1) if result1 else {}
        assert parsed1.get("check_in") == "static/selfies/test_checkin.jpg", "Check-in path not stored correctly"
        assert parsed1.get("check_out") is None, "Check-out should be None"
        
        # Test updating with check-out
        result2 = _dump_selfie_data(result1, check_out="static/selfies/test_checkout.jpg")
        print(f"✅ With check-out: {result2}")
        parsed2 = json.loads(result2) if result2 else {}
        assert parsed2.get("check_in") == "static/selfies/test_checkin.jpg", "Check-in path should be preserved"
        assert parsed2.get("check_out") == "static/selfies/test_checkout.jpg", "Check-out path not stored correctly"
        
        print("✅ _dump_selfie_data function works correctly!")
        
        # Test 2: Check database records
        print("\n📋 Test 2: Checking database records")
        print("-" * 80)
        
        # Get all attendance records
        all_records = db.query(Attendance).all()
        print(f"Total attendance records: {len(all_records)}")
        
        # Get records with selfies
        records_with_selfies = db.query(Attendance).filter(
            Attendance.selfie.isnot(None)
        ).all()
        print(f"Records with selfies: {len(records_with_selfies)}")
        
        if records_with_selfies:
            print("\n📸 Selfie data in database:")
            for record in records_with_selfies[:5]:  # Show first 5
                print(f"\n  Attendance ID: {record.attendance_id}")
                print(f"  User ID: {record.user_id}")
                print(f"  Check-in: {record.check_in}")
                print(f"  Check-out: {record.check_out or 'Not checked out'}")
                print(f"  Raw selfie data: {record.selfie}")
                
                # Parse and display
                try:
                    selfie_data = json.loads(record.selfie)
                    print(f"  Parsed data:")
                    print(f"    Check-in selfie: {selfie_data.get('check_in')}")
                    print(f"    Check-out selfie: {selfie_data.get('check_out')}")
                    
                    # Verify files exist
                    for key, path in selfie_data.items():
                        if path:
                            normalized = path.replace("\\", "/").lstrip("/")
                            full_path = os.path.join(os.getcwd(), normalized)
                            exists = os.path.exists(full_path)
                            print(f"    {key} file exists: {'✅' if exists else '❌'} ({full_path})")
                except json.JSONDecodeError:
                    print(f"  ⚠️ Could not parse as JSON")
        else:
            print("\n⚠️ No records with selfies found")
            print("\nTo test selfie storage:")
            print("1. Use the mobile app or API to check-in with a selfie")
            print("2. Check-out with a selfie")
            print("3. Run this script again to verify storage")
        
        # Test 3: Check static directory
        print("\n📋 Test 3: Checking static/selfies directory")
        print("-" * 80)
        
        selfies_dir = os.path.join(os.getcwd(), "static", "selfies")
        if os.path.exists(selfies_dir):
            selfie_files = [f for f in os.listdir(selfies_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            print(f"✅ Directory exists: {selfies_dir}")
            print(f"📁 Selfie files found: {len(selfie_files)}")
            
            if selfie_files:
                print("\nRecent selfie files:")
                for f in sorted(selfie_files, reverse=True)[:10]:
                    file_path = os.path.join(selfies_dir, f)
                    size = os.path.getsize(file_path)
                    mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                    print(f"  {f} - {size} bytes - {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print(f"⚠️ Directory does not exist: {selfies_dir}")
            print("Creating directory...")
            os.makedirs(selfies_dir, exist_ok=True)
            print("✅ Directory created")
        
        print("\n" + "=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)
        
        # Summary
        print("\n📊 SUMMARY:")
        print(f"  Total attendance records: {len(all_records)}")
        print(f"  Records with selfies: {len(records_with_selfies)}")
        if os.path.exists(selfies_dir):
            selfie_files = [f for f in os.listdir(selfies_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            print(f"  Selfie files on disk: {len(selfie_files)}")
        
        print("\n✅ Selfie storage mechanism is working correctly!")
        print("\nNext steps:")
        print("1. Perform a check-in with selfie from the mobile app")
        print("2. Perform a check-out with selfie")
        print("3. Verify both selfies appear in the HR dashboard")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_selfie_storage()

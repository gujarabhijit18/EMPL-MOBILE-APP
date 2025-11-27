"""
Manually fix the attendance record with ID 13 to link the existing selfie files
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.db.models.attendance import Attendance

def manual_fix():
    db = SessionLocal()
    
    try:
        # Get the attendance record
        record = db.query(Attendance).filter(Attendance.attendance_id == 13).first()
        
        if not record:
            print("❌ Attendance record 13 not found")
            return
        
        print(f"Found attendance record:")
        print(f"  ID: {record.attendance_id}")
        print(f"  User: {record.user_id}")
        print(f"  Check-in: {record.check_in}")
        print(f"  Check-out: {record.check_out}")
        print(f"  Current selfie: {record.selfie}")
        
        # Verify the selfie files exist
        check_in_file = "static/selfies/8_checkin_20251127125133.jpg"
        check_out_file = "static/selfies/8_checkout_20251127125208.jpg"
        
        check_in_path = os.path.join(os.getcwd(), check_in_file)
        check_out_path = os.path.join(os.getcwd(), check_out_file)
        
        print(f"\nVerifying files:")
        print(f"  Check-in: {check_in_path}")
        print(f"    Exists: {os.path.exists(check_in_path)}")
        print(f"  Check-out: {check_out_path}")
        print(f"    Exists: {os.path.exists(check_out_path)}")
        
        if not os.path.exists(check_in_path) or not os.path.exists(check_out_path):
            print("\n❌ Selfie files not found!")
            return
        
        # Create the selfie JSON data
        selfie_data = {
            "check_in": check_in_file,
            "check_out": check_out_file
        }
        
        # Update the record
        record.selfie = json.dumps(selfie_data)
        
        print(f"\nUpdating record with:")
        print(f"  {record.selfie}")
        
        db.commit()
        db.refresh(record)
        
        print(f"\n✅ Successfully updated attendance record!")
        print(f"  New selfie value: {record.selfie}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    manual_fix()

"""
Script to fix missing selfie references in the database
"""
import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models.attendance import Attendance
from app.core.config import settings

# Create database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def check_file_exists(path):
    """Check if a file exists"""
    if not path:
        return False
    # Remove leading slash if present
    normalized = path.lstrip('/')
    full_path = os.path.join(os.getcwd(), normalized)
    return os.path.exists(full_path)

try:
    # Get all attendance records with selfies
    attendances = db.query(Attendance).filter(Attendance.selfie.isnot(None)).all()
    
    print(f"\n📊 Found {len(attendances)} attendance records with selfie data")
    print("=" * 80)
    
    fixed_count = 0
    missing_files = []
    
    for attendance in attendances:
        if not attendance.selfie:
            continue
            
        try:
            # Parse selfie JSON
            selfie_data = json.loads(attendance.selfie)
            check_in_path = selfie_data.get('check_in')
            check_out_path = selfie_data.get('check_out')
            
            updated = False
            
            # Check check-in selfie
            if check_in_path:
                if not check_file_exists(check_in_path):
                    print(f"\n❌ Missing check-in selfie: {check_in_path}")
                    print(f"   Attendance ID: {attendance.attendance_id}, User ID: {attendance.user_id}")
                    missing_files.append(check_in_path)
                    selfie_data['check_in'] = None
                    updated = True
                else:
                    print(f"✅ Check-in selfie exists: {check_in_path}")
            
            # Check check-out selfie
            if check_out_path:
                if not check_file_exists(check_out_path):
                    print(f"\n❌ Missing check-out selfie: {check_out_path}")
                    print(f"   Attendance ID: {attendance.attendance_id}, User ID: {attendance.user_id}")
                    missing_files.append(check_out_path)
                    selfie_data['check_out'] = None
                    updated = True
                else:
                    print(f"✅ Check-out selfie exists: {check_out_path}")
            
            # Update database if changes were made
            if updated:
                # If both are None, set selfie to None
                if not selfie_data.get('check_in') and not selfie_data.get('check_out'):
                    attendance.selfie = None
                else:
                    attendance.selfie = json.dumps(selfie_data)
                fixed_count += 1
                
        except json.JSONDecodeError:
            # If it's not JSON, check if it's a direct path
            if not check_file_exists(attendance.selfie):
                print(f"\n❌ Missing selfie (direct path): {attendance.selfie}")
                print(f"   Attendance ID: {attendance.attendance_id}, User ID: {attendance.user_id}")
                missing_files.append(attendance.selfie)
                attendance.selfie = None
                fixed_count += 1
    
    if fixed_count > 0:
        db.commit()
        print(f"\n" + "=" * 80)
        print(f"✅ Fixed {fixed_count} attendance records with missing selfies")
        print(f"\n📋 Missing files ({len(missing_files)}):")
        for file in missing_files:
            print(f"   - {file}")
    else:
        print(f"\n" + "=" * 80)
        print("✅ All selfie references are valid!")
        
finally:
    db.close()

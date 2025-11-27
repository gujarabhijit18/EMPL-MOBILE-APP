"""
Script to fix selfie references in the attendance database.
This will match existing selfie files to attendance records based on user_id and timestamp.
"""
import os
import json
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models.attendance import Attendance
from app.core.config import settings

INDIA_TZ = ZoneInfo("Asia/Kolkata")
UTC_TZ = ZoneInfo("UTC")

# Create database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

SELFIE_DIR = os.path.join(os.getcwd(), "static", "selfies")

def parse_selfie_filename(filename):
    """Parse selfie filename to extract user_id, type (checkin/checkout), and timestamp."""
    # Format: {user_id}_{checkin|checkout}_{timestamp}.jpg
    pattern = r'^(\d+)_(checkin|checkout)_(\d{14})\.jpg$'
    match = re.match(pattern, filename)
    if match:
        user_id = int(match.group(1))
        selfie_type = match.group(2)
        timestamp_str = match.group(3)
        # Parse timestamp (IST)
        timestamp = datetime.strptime(timestamp_str, '%Y%m%d%H%M%S')
        timestamp = timestamp.replace(tzinfo=INDIA_TZ)
        return user_id, selfie_type, timestamp
    return None, None, None

def find_matching_attendance(user_id, selfie_timestamp, selfie_type):
    """Find attendance record that matches the selfie."""
    # Convert selfie timestamp to UTC for comparison
    selfie_utc = selfie_timestamp.astimezone(UTC_TZ).replace(tzinfo=None)
    
    # Look for attendance records within 5 minutes of the selfie timestamp
    time_window = timedelta(minutes=5)
    
    if selfie_type == 'checkin':
        # Find attendance where check_in is close to selfie timestamp
        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.user_id == user_id,
                Attendance.check_in >= selfie_utc - time_window,
                Attendance.check_in <= selfie_utc + time_window
            )
            .first()
        )
    else:  # checkout
        # Find attendance where check_out is close to selfie timestamp
        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.user_id == user_id,
                Attendance.check_out >= selfie_utc - time_window,
                Attendance.check_out <= selfie_utc + time_window
            )
            .first()
        )
    
    return attendance

def main():
    print("\n" + "=" * 80)
    print("FIXING SELFIE REFERENCES IN DATABASE")
    print("=" * 80)
    
    # Get all selfie files
    if not os.path.exists(SELFIE_DIR):
        print(f"❌ Selfie directory not found: {SELFIE_DIR}")
        return
    
    selfie_files = [f for f in os.listdir(SELFIE_DIR) if f.endswith('.jpg')]
    print(f"\n📁 Found {len(selfie_files)} selfie files")
    
    fixed_count = 0
    
    for filename in sorted(selfie_files):
        user_id, selfie_type, timestamp = parse_selfie_filename(filename)
        if user_id is None:
            print(f"⚠️ Could not parse filename: {filename}")
            continue
        
        print(f"\n📸 Processing: {filename}")
        print(f"   User ID: {user_id}, Type: {selfie_type}, Time: {timestamp}")
        
        # Find matching attendance record
        attendance = find_matching_attendance(user_id, timestamp, selfie_type)
        
        if attendance:
            print(f"   ✅ Found matching attendance ID: {attendance.attendance_id}")
            
            # Parse existing selfie data
            existing_data = {}
            if attendance.selfie:
                try:
                    existing_data = json.loads(attendance.selfie)
                except:
                    pass
            
            # Update selfie data
            selfie_path = f"static/selfies/{filename}"
            if selfie_type == 'checkin':
                if not existing_data.get('check_in'):
                    existing_data['check_in'] = selfie_path
                    print(f"   📸 Setting check_in selfie: {selfie_path}")
                else:
                    print(f"   ℹ️ Check-in selfie already set: {existing_data['check_in']}")
            else:  # checkout
                if not existing_data.get('check_out'):
                    existing_data['check_out'] = selfie_path
                    print(f"   📸 Setting check_out selfie: {selfie_path}")
                else:
                    print(f"   ℹ️ Check-out selfie already set: {existing_data['check_out']}")
            
            # Save updated selfie data
            if existing_data:
                new_selfie_json = json.dumps(existing_data)
                if attendance.selfie != new_selfie_json:
                    attendance.selfie = new_selfie_json
                    fixed_count += 1
                    print(f"   💾 Updated selfie data: {new_selfie_json}")
        else:
            print(f"   ⚠️ No matching attendance record found")
    
    # Commit changes
    if fixed_count > 0:
        db.commit()
        print(f"\n✅ Fixed {fixed_count} attendance records")
    else:
        print(f"\n✅ No records needed fixing")
    
    # Show final state
    print("\n" + "=" * 80)
    print("FINAL STATE")
    print("=" * 80)
    
    records_with_selfies = db.query(Attendance).filter(Attendance.selfie.isnot(None)).count()
    total_records = db.query(Attendance).count()
    print(f"\n📊 Total attendance records: {total_records}")
    print(f"📊 Records with selfies: {records_with_selfies}")

if __name__ == "__main__":
    try:
        main()
    finally:
        db.close()

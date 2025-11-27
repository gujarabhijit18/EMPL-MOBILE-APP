"""
Script to restore selfie references for existing files
This will help test the display without requiring new check-ins
"""
import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models.attendance import Attendance
from app.core.config import settings
from datetime import datetime

# Create database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def find_selfie_for_user(user_id, selfie_type='checkin'):
    """Find the most recent selfie file for a user"""
    selfie_dir = 'static/selfies'
    if not os.path.exists(selfie_dir):
        return None
    
    # List all files for this user
    files = [f for f in os.listdir(selfie_dir) 
             if f.startswith(f"{user_id}_{selfie_type}") and f.endswith('.jpg')]
    
    if not files:
        return None
    
    # Sort by filename (which includes timestamp) and get the most recent
    files.sort(reverse=True)
    return os.path.join(selfie_dir, files[0])

try:
    # Get today's attendance records
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    attendances = db.query(Attendance).filter(Attendance.check_in >= today_start).all()
    
    print(f"\n📊 Found {len(attendances)} attendance records for today")
    print("=" * 80)
    
    updated_count = 0
    
    for attendance in attendances:
        user_id = attendance.user_id
        print(f"\n👤 User ID: {user_id}, Attendance ID: {attendance.attendance_id}")
        
        # Find available selfie files
        checkin_file = find_selfie_for_user(user_id, 'checkin')
        checkout_file = find_selfie_for_user(user_id, 'checkout') if attendance.check_out else None
        
        if checkin_file:
            print(f"   ✅ Found check-in selfie: {checkin_file}")
        else:
            print(f"   ❌ No check-in selfie found")
            
        if attendance.check_out:
            if checkout_file:
                print(f"   ✅ Found check-out selfie: {checkout_file}")
            else:
                print(f"   ❌ No check-out selfie found")
        
        # Update database if we found files
        if checkin_file or checkout_file:
            selfie_data = {}
            if checkin_file:
                selfie_data['check_in'] = checkin_file
            if checkout_file:
                selfie_data['check_out'] = checkout_file
            
            attendance.selfie = json.dumps(selfie_data)
            updated_count += 1
            print(f"   📝 Updated database with selfie references")
    
    if updated_count > 0:
        db.commit()
        print(f"\n" + "=" * 80)
        print(f"✅ Updated {updated_count} attendance records with selfie references")
    else:
        print(f"\n" + "=" * 80)
        print("ℹ️  No updates needed")
        
finally:
    db.close()

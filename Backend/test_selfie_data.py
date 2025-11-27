"""
Test script to check selfie data in the database
"""
import json
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models.attendance import Attendance

# Create database connection
DATABASE_URL = "sqlite:///./attendance.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Get the most recent attendance record
    attendance = db.query(Attendance).order_by(Attendance.attendance_id.desc()).first()
    
    if attendance:
        print(f"\n📋 Latest Attendance Record:")
        print(f"   ID: {attendance.attendance_id}")
        print(f"   User ID: {attendance.user_id}")
        print(f"   Check-in: {attendance.check_in}")
        print(f"   Check-out: {attendance.check_out}")
        print(f"\n📸 Selfie Data (raw):")
        print(f"   Type: {type(attendance.selfie)}")
        print(f"   Value: {attendance.selfie}")
        
        if attendance.selfie:
            try:
                selfie_data = json.loads(attendance.selfie)
                print(f"\n✅ Parsed Selfie JSON:")
                print(f"   check_in: {selfie_data.get('check_in')}")
                print(f"   check_out: {selfie_data.get('check_out')}")
            except json.JSONDecodeError as e:
                print(f"\n❌ Failed to parse JSON: {e}")
    else:
        print("No attendance records found")
        
finally:
    db.close()

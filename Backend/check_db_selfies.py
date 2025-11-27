"""
Check what selfie data is in the database
"""
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

try:
    # Get today's attendance records
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    attendances = db.query(Attendance).filter(Attendance.check_in >= today_start).all()
    
    print(f"\n📊 Attendance records for today:")
    print("=" * 80)
    
    for attendance in attendances:
        print(f"\n👤 Attendance ID: {attendance.attendance_id}, User ID: {attendance.user_id}")
        print(f"   Check-in: {attendance.check_in}")
        print(f"   Check-out: {attendance.check_out}")
        print(f"   Selfie (raw): {attendance.selfie}")
        
        if attendance.selfie:
            try:
                selfie_data = json.loads(attendance.selfie)
                print(f"   Parsed selfie data:")
                print(f"      check_in: {selfie_data.get('check_in')}")
                print(f"      check_out: {selfie_data.get('check_out')}")
            except:
                print(f"   Could not parse as JSON")
        
finally:
    db.close()

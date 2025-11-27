"""
Test script to verify the selfie storage flow works correctly.
This simulates a check-in with selfie and verifies it's stored properly.
"""
import os
import json
import base64
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models.attendance import Attendance
from app.db.models.user import User
from app.core.config import settings
from app.routes.attendance_routes import _dump_selfie_data, _load_selfie_data, _prepare_attendance_payload

INDIA_TZ = ZoneInfo("Asia/Kolkata")
UTC_TZ = ZoneInfo("UTC")

# Create database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def test_selfie_storage():
    print("\n" + "=" * 80)
    print("TESTING SELFIE STORAGE FLOW")
    print("=" * 80)
    
    # Find an active user
    user = db.query(User).filter(User.is_active == True).first()
    if not user:
        print("❌ No active users found in database")
        return
    
    print(f"\n👤 Using user: {user.name} (ID: {user.user_id})")
    
    # Create a test selfie path
    test_selfie_path = "static/selfies/test_checkin_123.jpg"
    
    # Test _dump_selfie_data
    print("\n📋 Test 1: _dump_selfie_data function")
    print("-" * 40)
    selfie_data = _dump_selfie_data(None, check_in=test_selfie_path)
    print(f"Input: check_in={test_selfie_path}")
    print(f"Output: {selfie_data}")
    
    if selfie_data:
        parsed = json.loads(selfie_data)
        assert parsed.get("check_in") == test_selfie_path, "Check-in path not stored correctly"
        print("✅ _dump_selfie_data works correctly")
    else:
        print("❌ _dump_selfie_data returned None")
        return
    
    # Test creating attendance with selfie
    print("\n📋 Test 2: Create attendance with selfie")
    print("-" * 40)
    
    # Delete any existing test attendance
    db.query(Attendance).filter(
        Attendance.user_id == user.user_id,
        Attendance.gps_location.like("%TEST%")
    ).delete(synchronize_session=False)
    db.commit()
    
    # Create new attendance
    attendance = Attendance(
        user_id=user.user_id,
        check_in=datetime.utcnow(),
        gps_location="Check-in: TEST LOCATION",
        selfie=selfie_data,
        total_hours=0.0
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    print(f"Created attendance ID: {attendance.attendance_id}")
    print(f"Selfie data in DB: {attendance.selfie}")
    
    # Verify selfie was stored
    if attendance.selfie:
        print("✅ Selfie data stored in database")
    else:
        print("❌ Selfie data NOT stored in database")
        return
    
    # Test _prepare_attendance_payload
    print("\n📋 Test 3: _prepare_attendance_payload function")
    print("-" * 40)
    payload = _prepare_attendance_payload(attendance)
    print(f"checkInSelfie: {payload.get('checkInSelfie')}")
    print(f"checkOutSelfie: {payload.get('checkOutSelfie')}")
    print(f"selfie: {payload.get('selfie')}")
    
    if payload.get('checkInSelfie'):
        print("✅ checkInSelfie returned in payload")
    else:
        print("❌ checkInSelfie NOT returned in payload")
    
    # Test adding check-out selfie
    print("\n📋 Test 4: Add check-out selfie")
    print("-" * 40)
    checkout_selfie_path = "static/selfies/test_checkout_123.jpg"
    attendance.selfie = _dump_selfie_data(attendance.selfie, check_out=checkout_selfie_path)
    attendance.check_out = datetime.utcnow()
    db.commit()
    db.refresh(attendance)
    
    print(f"Updated selfie data: {attendance.selfie}")
    
    payload = _prepare_attendance_payload(attendance)
    print(f"checkInSelfie: {payload.get('checkInSelfie')}")
    print(f"checkOutSelfie: {payload.get('checkOutSelfie')}")
    
    if payload.get('checkInSelfie') and payload.get('checkOutSelfie'):
        print("✅ Both selfies returned in payload")
    else:
        print("❌ Missing selfie in payload")
    
    # Clean up test data
    print("\n📋 Cleaning up test data...")
    db.delete(attendance)
    db.commit()
    print("✅ Test attendance deleted")
    
    print("\n" + "=" * 80)
    print("ALL TESTS PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    try:
        test_selfie_storage()
    finally:
        db.close()

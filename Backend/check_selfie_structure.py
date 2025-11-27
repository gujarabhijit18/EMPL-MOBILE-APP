#!/usr/bin/env python
"""Check the structure of selfie data in the database"""
import json
from app.db.models.attendance import Attendance
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = 'sqlite:///./attendance.db'
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Get the most recent attendance record
    attendance = db.query(Attendance).order_by(Attendance.attendance_id.desc()).first()

    if attendance:
        print(f'Latest Attendance ID: {attendance.attendance_id}')
        print(f'Selfie field (raw): {attendance.selfie}')
        print(f'Selfie field type: {type(attendance.selfie)}')
        
        if attendance.selfie:
            try:
                selfie_data = json.loads(attendance.selfie)
                print(f'Parsed selfie data: {json.dumps(selfie_data, indent=2)}')
            except Exception as e:
                print(f'Could not parse as JSON: {e}')
    else:
        print('No attendance records found')
finally:
    db.close()

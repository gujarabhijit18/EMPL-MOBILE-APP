"""
Script to fix existing attendance records by linking them to their selfie files
"""
import os
import sys
import json
from datetime import datetime, timedelta

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.db.models.attendance import Attendance

def fix_existing_selfies():
    """Link existing selfie files to their attendance records"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("FIXING EXISTING ATTENDANCE RECORDS WITH SELFIES")
        print("=" * 80)
        
        # Get all selfie files
        selfies_dir = os.path.join(os.getcwd(), "static", "selfies")
        if not os.path.exists(selfies_dir):
            print("❌ Selfies directory not found")
            return
        
        selfie_files = [f for f in os.listdir(selfies_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        print(f"\n📁 Found {len(selfie_files)} selfie files")
        
        # Group selfies by user and type
        selfies_by_user = {}
        for filename in selfie_files:
            # Parse filename: {user_id}_{type}_{timestamp}.jpg
            parts = filename.rsplit('_', 2)
            if len(parts) == 3:
                user_id = int(parts[0])
                selfie_type = parts[1]  # 'checkin' or 'checkout'
                timestamp_str = parts[2].split('.')[0]  # Remove extension
                
                # Parse timestamp
                file_time = datetime.strptime(timestamp_str, '%Y%m%d%H%M%S')
                
                if user_id not in selfies_by_user:
                    selfies_by_user[user_id] = []
                
                selfies_by_user[user_id].append({
                    'filename': filename,
                    'type': selfie_type,
                    'timestamp': file_time,
                    'path': f"static/selfies/{filename}"
                })
        
        print(f"\n👥 Selfies found for {len(selfies_by_user)} users")
        
        # Get attendance records without selfies
        records = db.query(Attendance).filter(
            Attendance.selfie.is_(None)
        ).all()
        
        print(f"\n📋 Found {len(records)} attendance records without selfies")
        
        fixed_count = 0
        for record in records:
            user_selfies = selfies_by_user.get(record.user_id, [])
            if not user_selfies:
                continue
            
            print(f"\n{'─' * 80}")
            print(f"Processing Attendance ID: {record.attendance_id}")
            print(f"  User ID: {record.user_id}")
            print(f"  Check-in: {record.check_in}")
            print(f"  Check-out: {record.check_out}")
            
            # Find matching selfies based on timestamp
            check_in_selfie = None
            check_out_selfie = None
            
            # Convert UTC times to IST for comparison (India timezone)
            from zoneinfo import ZoneInfo
            INDIA_TZ = ZoneInfo("Asia/Kolkata")
            UTC_TZ = ZoneInfo("UTC")
            
            check_in_ist = record.check_in.replace(tzinfo=UTC_TZ).astimezone(INDIA_TZ)
            check_out_ist = record.check_out.replace(tzinfo=UTC_TZ).astimezone(INDIA_TZ) if record.check_out else None
            
            print(f"  Check-in (IST): {check_in_ist}")
            if check_out_ist:
                print(f"  Check-out (IST): {check_out_ist}")
            
            # Find check-in selfie (within 5 minutes of check-in time)
            for selfie in user_selfies:
                if selfie['type'] == 'checkin':
                    # Make selfie timestamp timezone-aware (IST)
                    selfie_time = selfie['timestamp'].replace(tzinfo=INDIA_TZ)
                    time_diff = abs((selfie_time - check_in_ist).total_seconds())
                    if time_diff < 300:  # Within 5 minutes
                        check_in_selfie = selfie['path']
                        print(f"  ✅ Found check-in selfie: {selfie['filename']} (diff: {time_diff:.0f}s)")
                        break
            
            # Find check-out selfie (within 5 minutes of check-out time)
            if check_out_ist:
                for selfie in user_selfies:
                    if selfie['type'] == 'checkout':
                        selfie_time = selfie['timestamp'].replace(tzinfo=INDIA_TZ)
                        time_diff = abs((selfie_time - check_out_ist).total_seconds())
                        if time_diff < 300:  # Within 5 minutes
                            check_out_selfie = selfie['path']
                            print(f"  ✅ Found check-out selfie: {selfie['filename']} (diff: {time_diff:.0f}s)")
                            break
            
            # Update record if selfies found
            if check_in_selfie or check_out_selfie:
                selfie_data = {}
                if check_in_selfie:
                    selfie_data['check_in'] = check_in_selfie
                if check_out_selfie:
                    selfie_data['check_out'] = check_out_selfie
                
                record.selfie = json.dumps(selfie_data)
                print(f"  📝 Updated selfie field: {record.selfie}")
                fixed_count += 1
            else:
                print(f"  ⚠️ No matching selfies found")
        
        if fixed_count > 0:
            db.commit()
            print(f"\n{'=' * 80}")
            print(f"✅ Successfully updated {fixed_count} attendance records")
            print("=" * 80)
        else:
            print(f"\n{'=' * 80}")
            print("⚠️ No records were updated")
            print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_existing_selfies()

"""
Script to clean up broken selfie references in the attendance database.
This will set selfie fields to NULL for records where the referenced files don't exist.
"""
import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def cleanup_broken_selfies():
    """Remove references to non-existent selfie files from the database"""
    db = SessionLocal()
    try:
        # Get all attendance records with selfie data
        result = db.execute(text("SELECT attendance_id, selfie FROM attendance WHERE selfie IS NOT NULL"))
        records = result.fetchall()
        
        cleaned_count = 0
        for attendance_id, selfie_json in records:
            if not selfie_json:
                continue
                
            try:
                # Parse the selfie JSON
                selfie_data = json.loads(selfie_json)
                updated = False
                
                # Check check-in selfie
                if selfie_data.get("check_in"):
                    check_in_path = selfie_data["check_in"].lstrip("/")
                    full_path = os.path.join(os.getcwd(), check_in_path)
                    if not os.path.exists(full_path):
                        print(f"❌ Check-in selfie not found: {full_path}")
                        selfie_data["check_in"] = None
                        updated = True
                    else:
                        print(f"✅ Check-in selfie exists: {full_path}")
                
                # Check check-out selfie
                if selfie_data.get("check_out"):
                    check_out_path = selfie_data["check_out"].lstrip("/")
                    full_path = os.path.join(os.getcwd(), check_out_path)
                    if not os.path.exists(full_path):
                        print(f"❌ Check-out selfie not found: {full_path}")
                        selfie_data["check_out"] = None
                        updated = True
                    else:
                        print(f"✅ Check-out selfie exists: {full_path}")
                
                # Update database if changes were made
                if updated:
                    # If both are None, set the whole field to NULL
                    if not selfie_data.get("check_in") and not selfie_data.get("check_out"):
                        db.execute(
                            text("UPDATE attendance SET selfie = NULL WHERE attendance_id = :id"),
                            {"id": attendance_id}
                        )
                        print(f"🗑️  Cleared selfie data for attendance_id {attendance_id}")
                    else:
                        # Otherwise update with cleaned data
                        new_json = json.dumps(selfie_data)
                        db.execute(
                            text("UPDATE attendance SET selfie = :selfie WHERE attendance_id = :id"),
                            {"selfie": new_json, "id": attendance_id}
                        )
                        print(f"🔧 Updated selfie data for attendance_id {attendance_id}")
                    cleaned_count += 1
                    
            except json.JSONDecodeError:
                # If it's not JSON, it might be a legacy format (single path)
                selfie_path = selfie_json.lstrip("/")
                full_path = os.path.join(os.getcwd(), selfie_path)
                if not os.path.exists(full_path):
                    print(f"❌ Legacy selfie not found: {full_path}")
                    db.execute(
                        text("UPDATE attendance SET selfie = NULL WHERE attendance_id = :id"),
                        {"id": attendance_id}
                    )
                    print(f"🗑️  Cleared legacy selfie for attendance_id {attendance_id}")
                    cleaned_count += 1
                else:
                    print(f"✅ Legacy selfie exists: {full_path}")
        
        db.commit()
        print(f"\n✅ Cleanup complete! Cleaned {cleaned_count} broken references.")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🧹 Starting selfie reference cleanup...")
    print(f"📁 Working directory: {os.getcwd()}")
    cleanup_broken_selfies()

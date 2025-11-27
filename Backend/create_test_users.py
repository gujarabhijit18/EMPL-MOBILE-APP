#!/usr/bin/env python3
"""
Script to create test users in the database for role-based login testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.database import engine, get_db
from app.db.models.user import User
from app.enums import RoleEnum
from datetime import datetime

def create_test_users():

    
    # Create database session
    with Session(engine) as db:
        created_count = 0
        updated_count = 0
        
        for user_data in test_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            
            if existing_user:
                # Update existing user
                for key, value in user_data.items():
                    if hasattr(existing_user, key):
                        setattr(existing_user, key, value)
                updated_count += 1
                print(f"✅ Updated existing user: {user_data['email']} ({user_data['role'].value})")
            else:
                # Create new user
                user = User(**user_data)
                db.add(user)
                created_count += 1
                print(f"✅ Created new user: {user_data['email']} ({user_data['role'].value})")
        
        # Commit changes
        try:
            db.commit()
            print(f"\n🎉 Database update completed!")
            print(f"   Created: {created_count} new users")
            print(f"   Updated: {updated_count} existing users")
            print(f"   Total:   {created_count + updated_count} users")
            
            print(f"\n📧 Test Emails for Login:")
            print(f"   Admin:     admin@company.com")
            print(f"   HR:        hr@company.com") 
            print(f"   Manager:   manager@company.com")
            print(f"   Team Lead: teamlead@company.com")
            print(f"   Employee:  employee@company.com")
            
        except Exception as e:
            print(f"❌ Error committing to database: {e}")
            db.rollback()
            return False
    
    return True

if __name__ == "__main__":
    print("🔧 Creating test users for role-based login...")
    print("=" * 50)
    
    success = create_test_users()
    
    if success:
        print("\n✅ Test users created successfully!")
        print("\n📋 Next Steps:")
        print("1. Start the backend server: uvicorn app.main:app --reload --port 8000")
        print("2. Start the frontend: expo start")
        print("3. Use any of the test emails to login")
        print("4. Check backend console for OTP in development mode")
    else:
        print("\n❌ Failed to create test users. Please check your database connection.")
        sys.exit(1)

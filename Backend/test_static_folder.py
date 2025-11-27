#!/usr/bin/env python3
"""
Test script to verify static folder setup for profile photos
"""
import os
from pathlib import Path

def test_static_folder():
    print("🧪 Testing Static Folder Setup\n")
    print("=" * 60)
    
    # Check if static folder exists
    static_dir = Path("static")
    if static_dir.exists():
        print("✅ static/ folder exists")
    else:
        print("❌ static/ folder does NOT exist")
        print("   Creating it now...")
        os.makedirs("static", exist_ok=True)
        print("✅ Created static/ folder")
    
    # Check if profile_photos folder exists
    profile_photos_dir = Path("static/profile_photos")
    if profile_photos_dir.exists():
        print("✅ static/profile_photos/ folder exists")
    else:
        print("❌ static/profile_photos/ folder does NOT exist")
        print("   Creating it now...")
        os.makedirs("static/profile_photos", exist_ok=True)
        print("✅ Created static/profile_photos/ folder")
    
    # Check if selfies folder exists
    selfies_dir = Path("static/selfies")
    if selfies_dir.exists():
        print("✅ static/selfies/ folder exists")
    else:
        print("❌ static/selfies/ folder does NOT exist")
        print("   Creating it now...")
        os.makedirs("static/selfies", exist_ok=True)
        print("✅ Created static/selfies/ folder")
    
    print("\n" + "=" * 60)
    print("📊 Static Folder Contents:\n")
    
    # List profile photos
    if profile_photos_dir.exists():
        photos = list(profile_photos_dir.glob("*"))
        if photos:
            print(f"📸 Profile Photos ({len(photos)} files):")
            for photo in photos[:10]:  # Show first 10
                size = photo.stat().st_size / 1024  # KB
                print(f"   - {photo.name} ({size:.1f} KB)")
            if len(photos) > 10:
                print(f"   ... and {len(photos) - 10} more")
        else:
            print("📸 Profile Photos: (empty)")
    
    # List selfies
    if selfies_dir.exists():
        selfies = list(selfies_dir.glob("*"))
        if selfies:
            print(f"\n🤳 Selfies ({len(selfies)} files):")
            for selfie in selfies[:10]:  # Show first 10
                size = selfie.stat().st_size / 1024  # KB
                print(f"   - {selfie.name} ({size:.1f} KB)")
            if len(selfies) > 10:
                print(f"   ... and {len(selfies) - 10} more")
        else:
            print("\n🤳 Selfies: (empty)")
    
    print("\n" + "=" * 60)
    print("🌐 Access URLs:\n")
    print("Profile Photos: http://localhost:8000/static/profile_photos/")
    print("Selfies:        http://localhost:8000/static/selfies/")
    print("\n" + "=" * 60)
    print("✅ Static folder setup is complete!")
    print("\nTo test:")
    print("1. Start backend: uvicorn app.main:app --reload")
    print("2. Upload a photo via /employees/register endpoint")
    print("3. Access it at: http://localhost:8000/static/profile_photos/filename.jpg")

if __name__ == "__main__":
    test_static_folder()

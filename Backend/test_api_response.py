"""
Test script to check what the API is returning
"""
import requests
import json

# Test the attendance API
url = "http://192.168.1.37:8000/attendance/all?date=2025-11-25"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"\n📋 Response Data:")
    print("=" * 80)
    
    data = response.json()
    
    for record in data:
        print(f"\n👤 {record.get('name')} (ID: {record.get('attendance_id')})")
        print(f"   Check-in Selfie: {record.get('checkInSelfie')}")
        print(f"   Check-out Selfie: {record.get('checkOutSelfie')}")
        print(f"   Selfie (raw): {record.get('selfie')}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

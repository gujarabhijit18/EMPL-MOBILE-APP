"""
Test script to verify selfie saving works correctly
"""
import os
import base64
from datetime import datetime

# Create a small test image (1x1 red pixel PNG)
test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

try:
    # Decode the base64 image
    raw = base64.b64decode(test_image_base64)
    
    # Create upload directory
    UPLOAD_DIR = "static/selfies"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate filename
    user_id = 999
    file_name = f"{user_id}_test_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    print(f"📁 Saving test image to: {file_path}")
    
    # Save the file
    with open(file_path, 'wb') as f:
        f.write(raw)
    
    # Verify file was saved
    if os.path.exists(file_path):
        file_size = os.path.getsize(file_path)
        print(f"✅ Test image saved successfully!")
        print(f"   Path: {file_path}")
        print(f"   Size: {file_size} bytes")
        
        # Try to read it back
        with open(file_path, 'rb') as f:
            content = f.read()
            print(f"   Read back: {len(content)} bytes")
            
        # Clean up test file
        os.remove(file_path)
        print(f"🗑️  Test file cleaned up")
    else:
        print(f"❌ Failed to save test image!")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

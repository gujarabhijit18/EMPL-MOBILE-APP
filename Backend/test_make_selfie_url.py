"""
Test the _make_selfie_url function
"""
import os

def _make_selfie_url(path):
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    
    # Normalize path - remove leading slash and convert backslashes to forward slashes
    normalized = path.replace("\\", "/").lstrip("/")
    
    # Return the URL path
    return f"/{normalized}"

# Test with the actual paths from the database
test_paths = [
    "static/selfies\\12_checkin_20251124181553.jpg",
    "static/selfies\\12_checkout_20251124181846.jpg",
    "static/selfies/12_checkin_20251124181553.jpg",
    "/static/selfies/12_checkin_20251124181553.jpg",
]

print("Testing _make_selfie_url function:")
print("=" * 80)

for path in test_paths:
    result = _make_selfie_url(path)
    print(f"\nInput:  {path}")
    print(f"Output: {result}")
    
    # Check if file exists
    normalized = path.replace("\\", "/").lstrip("/")
    full_path = os.path.join(os.getcwd(), normalized)
    exists = os.path.exists(full_path)
    print(f"File exists: {exists}")
    if exists:
        size = os.path.getsize(full_path)
        print(f"File size: {size} bytes")

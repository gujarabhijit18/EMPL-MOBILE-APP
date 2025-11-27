"""
Test script to verify bulk upload packages are installed correctly
"""

print("Testing bulk upload dependencies...")
print("=" * 60)

# Test PyPDF2
try:
    import PyPDF2
    print("✅ PyPDF2 imported successfully")
    print(f"   Version: {PyPDF2.__version__}")
except ImportError as e:
    print(f"❌ PyPDF2 import failed: {e}")

# Test pandas
try:
    import pandas as pd
    print("✅ pandas imported successfully")
    print(f"   Version: {pd.__version__}")
except ImportError as e:
    print(f"❌ pandas import failed: {e}")

# Test openpyxl
try:
    import openpyxl
    print("✅ openpyxl imported successfully")
    print(f"   Version: {openpyxl.__version__}")
except ImportError as e:
    print(f"❌ openpyxl import failed: {e}")

print("=" * 60)

# Test CSV processing
print("\nTesting CSV processing...")
try:
    import csv
    from io import StringIO
    
    csv_data = "employee_id,name,email\nEMP001,John Doe,john@test.com"
    csv_file = StringIO(csv_data)
    csv_reader = csv.DictReader(csv_file)
    rows = list(csv_reader)
    print(f"✅ CSV processing works: {len(rows)} rows read")
except Exception as e:
    print(f"❌ CSV processing failed: {e}")

# Test Excel processing
print("\nTesting Excel processing...")
try:
    import pandas as pd
    from io import BytesIO
    
    # Create a simple Excel file in memory
    df = pd.DataFrame({
        'employee_id': ['EMP001'],
        'name': ['John Doe'],
        'email': ['john@test.com']
    })
    
    excel_buffer = BytesIO()
    df.to_excel(excel_buffer, index=False)
    excel_buffer.seek(0)
    
    # Read it back
    df_read = pd.read_excel(excel_buffer)
    print(f"✅ Excel processing works: {len(df_read)} rows read")
except Exception as e:
    print(f"❌ Excel processing failed: {e}")

# Test PDF processing
print("\nTesting PDF processing...")
try:
    import PyPDF2
    from io import BytesIO
    from reportlab.pdfgen import canvas
    
    # Create a simple PDF in memory
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer)
    c.drawString(100, 750, "employee_id,name,email")
    c.drawString(100, 730, "EMP001,John Doe,john@test.com")
    c.save()
    pdf_buffer.seek(0)
    
    # Read it back
    pdf_reader = PyPDF2.PdfReader(pdf_buffer)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    
    print(f"✅ PDF processing works: extracted {len(text)} characters")
except Exception as e:
    print(f"❌ PDF processing failed: {e}")

print("\n" + "=" * 60)
print("All tests completed!")

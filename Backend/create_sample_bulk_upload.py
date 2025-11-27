"""
Create sample bulk upload files for testing
"""

import csv
import random

def create_sample_csv(filename='sample_bulk_upload.csv', num_employees=5):
    """Create a sample CSV file with employee data"""
    
    departments = ['Engineering', 'HR', 'Marketing', 'Finance', 'Operations']
    designations = ['Software Engineer', 'HR Manager', 'Marketing Lead', 'Accountant', 'Operations Manager']
    roles = ['EMPLOYEE', 'HR', 'MANAGER', 'EMPLOYEE', 'EMPLOYEE']
    genders = ['Male', 'Female', 'Other']
    shifts = ['Day Shift', 'Night Shift', 'Rotational']
    employee_types = ['Full-time Employee Type', 'Part-time Employee Type', 'Contract Employee Type']
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'employee_id', 'name', 'email', 'department', 'designation',
            'phone', 'role', 'gender', 'shift_type', 'employee_type'
        ])
        
        writer.writeheader()
        
        for i in range(1, num_employees + 1):
            dept_idx = i % len(departments)
            writer.writerow({
                'employee_id': f'EMP{1000 + i}',
                'name': f'Test Employee {i}',
                'email': f'test.employee{i}@example.com',
                'department': departments[dept_idx],
                'designation': designations[dept_idx],
                'phone': f'98765{43210 + i}',
                'role': roles[dept_idx],
                'gender': random.choice(genders),
                'shift_type': random.choice(shifts),
                'employee_type': random.choice(employee_types)
            })
    
    print(f"✅ Created {filename} with {num_employees} employees")
    print(f"📋 Columns: employee_id, name, email, department, designation, phone, role, gender, shift_type, employee_type")
    return filename

def create_minimal_csv(filename='minimal_bulk_upload.csv'):
    """Create a minimal CSV with only required fields"""
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['employee_id', 'name', 'email'])
        
        writer.writeheader()
        
        for i in range(1, 4):
            writer.writerow({
                'employee_id': f'MIN{100 + i}',
                'name': f'Minimal User {i}',
                'email': f'minimal{i}@example.com'
            })
    
    print(f"✅ Created {filename} with 3 employees (minimal fields)")
    print(f"📋 Columns: employee_id, name, email")
    return filename

def create_excel_sample():
    """Create a sample Excel file"""
    try:
        import pandas as pd
        
        data = {
            'employee_id': ['EXL001', 'EXL002', 'EXL003'],
            'name': ['Excel User 1', 'Excel User 2', 'Excel User 3'],
            'email': ['excel1@example.com', 'excel2@example.com', 'excel3@example.com'],
            'department': ['Engineering', 'HR', 'Marketing'],
            'designation': ['Developer', 'HR Manager', 'Marketing Lead'],
            'phone': ['9876543210', '9876543211', '9876543212'],
            'role': ['EMPLOYEE', 'HR', 'EMPLOYEE'],
            'gender': ['Male', 'Female', 'Male'],
            'shift_type': ['Day Shift', 'Day Shift', 'Night Shift'],
            'employee_type': ['Full-time Employee Type', 'Full-time Employee Type', 'Part-time Employee Type']
        }
        
        df = pd.DataFrame(data)
        filename = 'sample_bulk_upload.xlsx'
        df.to_excel(filename, index=False)
        
        print(f"✅ Created {filename} with 3 employees")
        print(f"📋 Columns: {', '.join(data.keys())}")
        return filename
    except ImportError:
        print("❌ pandas not installed. Run: pip install pandas openpyxl")
        return None

if __name__ == '__main__':
    print("=" * 60)
    print("  SAMPLE BULK UPLOAD FILE GENERATOR")
    print("=" * 60)
    print()
    
    # Create CSV samples
    create_sample_csv('sample_bulk_upload.csv', 5)
    print()
    create_minimal_csv('minimal_bulk_upload.csv')
    print()
    
    # Create Excel sample
    excel_file = create_excel_sample()
    
    print()
    print("=" * 60)
    print("  FILES CREATED")
    print("=" * 60)
    print("1. sample_bulk_upload.csv - Full sample with all fields")
    print("2. minimal_bulk_upload.csv - Minimal sample with required fields only")
    if excel_file:
        print("3. sample_bulk_upload.xlsx - Excel format sample")
    print()
    print("📤 Use these files to test bulk upload functionality")
    print("=" * 60)

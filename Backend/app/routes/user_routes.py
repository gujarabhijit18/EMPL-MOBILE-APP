from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Union
from pathlib import Path
from app.schemas.user_schema import UserCreate, UserOut, UpdateRoleSchema, UpdateStatusSchema
from app.crud.user_crud import (
    create_user,
    list_users,
    update_user_role,
    update_user_status,
    delete_user,
    get_user_by_email,
    get_user_by_employee_id,
    get_user,
    export_users_pdf,
    export_users_csv,
)
from app.db.database import get_db
from app.dependencies import require_roles, get_current_user
from app.enums import RoleEnum
from app.db.models.user import User
import os
import shutil
from datetime import datetime
from pydantic import EmailStr
from starlette.responses import Response
from starlette.background import BackgroundTask

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _profile_photo_exists(photo_path: Optional[str]) -> bool:
    if not photo_path:
        return False
    candidate = Path(photo_path)
    if not candidate.is_absolute():
        candidate = (BASE_DIR / photo_path).resolve()
    return candidate.exists()


def _sanitize_user_record(user: User) -> dict:
    data = UserOut.model_validate(user).model_dump()
    if data.get("profile_photo") and not _profile_photo_exists(data["profile_photo"]):
        data["profile_photo"] = None
    return data


def _sanitize_users_response(payload: Union[User, List[User]]) -> Union[dict, List[dict]]:
    if isinstance(payload, list):
        return [_sanitize_user_record(item) for item in payload]
    return _sanitize_user_record(payload)
    return _sanitize_user_record(payload)


router = APIRouter(prefix="/employees", tags=["Employees"])

# ✅ Public: Register a new employee
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_employee(
    name: str = Form(...),
    email: EmailStr = Form(...),
    employee_id: str = Form(...),
    department: Optional[str] = Form(None),
    designation: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    role: Optional[RoleEnum] = Form(RoleEnum.EMPLOYEE),
    gender: Optional[str] = Form(None),
    resignation_date: Optional[datetime] = Form(None),
    pan_card: Optional[str] = Form(None),
    aadhar_card: Optional[str] = Form(None),
    shift_type: Optional[str] = Form(None),
    employee_type: Optional[str] = Form(None),  # ✅ Added
    profile_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):

    email = email.strip()
    employee_id = employee_id.strip()
    pan_card = pan_card.strip().upper() if pan_card else None
    aadhar_card = aadhar_card.strip() if aadhar_card else None

    # Check for duplicate email
    existing_user = get_user_by_email(db, email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee already exists with this email address",
        )
    
    # Check for duplicate employee_id
    existing_employee = get_user_by_employee_id(db, employee_id)
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee already exists with ID '{employee_id}'",
        )

    if pan_card:
        duplicate_pan = (
            db.query(User)
            .filter(User.pan_card.isnot(None))
            .filter(User.pan_card == pan_card)
            .first()
        )
        if duplicate_pan:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee already exists with this PAN card number",
            )

    if aadhar_card:
        duplicate_aadhar = (
            db.query(User)
            .filter(User.aadhar_card.isnot(None))
            .filter(User.aadhar_card == aadhar_card)
            .first()
        )
        if duplicate_aadhar:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee already exists with this Aadhar card number",
            )

    profile_photo_path = None
    if profile_photo:
        # Create a directory to store profile photos if it doesn't exist
        UPLOAD_DIR = "static/profile_photos"
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # Generate a unique filename
        file_extension = profile_photo.filename.split('.')[-1]
        file_name = f"{employee_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, file_name)

        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_photo.file, buffer)
        profile_photo_path = file_path

    user_in = UserCreate(
        name=name,
        email=email,
        employee_id=employee_id,
        department=department,
        designation=designation,
        phone=phone,
        address=address,
        role=role,
        gender=gender,
        resignation_date=resignation_date,
        pan_card=pan_card,
        aadhar_card=aadhar_card,
        shift_type=shift_type,
        employee_type=employee_type,  # ✅ Added
        profile_photo=profile_photo_path
    )

    try:
        created_user = create_user(db, user_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee already exists with the provided identifiers",
        )
    return _sanitize_users_response(created_user)

# # ✅ Admin & HR: Get all employees with optional search and filter
# @router.get("/", response_model=List[UserOut])
# def get_all_employees(
#     db: Session = Depends(get_db),
#     _: RoleEnum = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.HR])),
#     search: Optional[str] = Query(None, description="Search by name, email or department"),
#     department: Optional[str] = Query(None, description="Filter by department"),
#     role: Optional[RoleEnum] = Query(None, description="Filter by role")
# ):
#     employees = db.query(list_users(db)).all()  # base query

#     # Apply search filter
#     if search:
#         employees = [emp for emp in employees if search.lower() in emp.name.lower() 
#                      or search.lower() in emp.email.lower() 
#                      or (emp.department and search.lower() in emp.department.lower())]

#     # Apply department filter
#     if department:
#         employees = [emp for emp in employees if emp.department == department]

#     # Apply role filter
#     if role:
#         employees = [emp for emp in employees if emp.role == role]

#     return employees

@router.get("/", response_model=List[UserOut])
def get_all_employees_public(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name, email or department"),
    department: Optional[str] = Query(None, description="Filter by department"),
    role: Optional[RoleEnum] = Query(None, description="Filter by role")
):
    employees = list_users(db)  # ✅ fetch all users properly (no .query(list_users))

    # Apply search filter
    if search:
        employees = [
            emp for emp in employees
            if search.lower() in emp.name.lower()
            or search.lower() in emp.email.lower()
            or (emp.department and search.lower() in emp.department.lower())
        ]

    # Apply department filter
    if department:
        employees = [emp for emp in employees if emp.department == department]

    # Apply role filter
    if role:
        employees = [emp for emp in employees if emp.role == role]

    return _sanitize_users_response(employees)


# ✅ Update employee details with photo support (Form data)
@router.put("/{user_id}", response_model=UserOut)
def update_employee(
    user_id: int,
    name: str = Form(...),
    email: EmailStr = Form(...),
    employee_id: str = Form(...),
    department: Optional[str] = Form(None),
    designation: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    role: Optional[RoleEnum] = Form(None),
    gender: Optional[str] = Form(None),
    resignation_date: Optional[datetime] = Form(None),
    pan_card: Optional[str] = Form(None),
    aadhar_card: Optional[str] = Form(None),
    shift_type: Optional[str] = Form(None),
    employee_type: Optional[str] = Form(None),
    profile_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check permissions: User can update their own profile OR must be Admin/HR to update others
    if current_user.user_id != user_id and current_user.role not in [RoleEnum.ADMIN, RoleEnum.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. You can only update your own profile."
        )
    
    employee = get_user(db, user_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    # Handle profile photo upload
    profile_photo_path = employee.profile_photo  # Keep existing photo by default
    if profile_photo:
        # Create directory if it doesn't exist
        UPLOAD_DIR = "static/profile_photos"
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # Generate a unique filename
        file_extension = profile_photo.filename.split('.')[-1]
        file_name = f"{employee_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, file_name)

        # Delete old photo if it exists
        if employee.profile_photo and os.path.exists(employee.profile_photo):
            try:
                os.remove(employee.profile_photo)
            except:
                pass  # Ignore errors if file doesn't exist

        # Save the new file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_photo.file, buffer)
        profile_photo_path = file_path

    # Update fields
    employee.name = name
    employee.email = email
    employee.employee_id = employee_id
    employee.department = department
    employee.designation = designation
    employee.phone = phone
    employee.address = address
    employee.gender = gender
    employee.resignation_date = resignation_date
    employee.pan_card = pan_card
    employee.aadhar_card = aadhar_card
    employee.shift_type = shift_type
    employee.employee_type = employee_type
    employee.profile_photo = profile_photo_path
    
    # ✅ Only Admin/HR can change roles
    if current_user.role in [RoleEnum.ADMIN, RoleEnum.HR] and role:
        employee.role = role

    db.commit()
    db.refresh(employee)
    return _sanitize_users_response(employee)

# # ✅ Admin only: Update employee role
# @router.put("/{employee_id}/role", response_model=UserOut)
# def update_role(employee_id: int, role_data: UpdateRoleSchema, db: Session = Depends(get_db),
#                 _: RoleEnum = Depends(require_roles([RoleEnum.ADMIN]))):
#     employee = update_user_role(db, employee_id, role_data.role)
#     if not employee:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
#     return employee

@router.put("/{user_id}/role", response_model=UserOut)
def update_role_public(
    user_id: int,
    role_data: UpdateRoleSchema,
    db: Session = Depends(get_db)
):
    employee = update_user_role(db, user_id, role_data.role)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _sanitize_users_response(employee)

@router.put("/{user_id}/status", response_model=UserOut, summary="Activate/Deactivate Employee")
def update_employee_status(
    user_id: int,
    status_data: UpdateStatusSchema,
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate an employee
    - **user_id**: The ID of the employee
    - **is_active**: True to activate, False to deactivate
    """
    employee = update_user_status(db, user_id, status_data.is_active)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _sanitize_users_response(employee)

@router.get("/export/pdf", summary="Download all user details as PDF")
def download_users_pdf(
    db: Session = Depends(get_db),
    # _: RoleEnum = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.HR])) # Example for role-based access
):
    try:
        pdf_buffer = export_users_pdf(db)
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=\"employees_report.pdf\"",
                "Access-Control-Allow-Origin": "*",
            }
        )
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

@router.get("/export/csv", summary="Download all user details as CSV")
def download_users_csv(
    db: Session = Depends(get_db),
    # _: RoleEnum = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.HR])) # Example for role-based access
):
    csv_buffer = export_users_csv(db)
    return Response(
        content=csv_buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=\"users_report.csv\"",
            "Access-Control-Allow-Origin": "*",
        }
    )

@router.post("/bulk-upload", summary="Bulk upload employees from CSV, Excel, or PDF")
async def bulk_upload_employees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk upload employees from CSV, Excel (.xlsx, .xls), or PDF file
    Format: employee_id,name,email,department,designation,phone,role,gender,shift_type,employee_type
    """
    # Check permissions
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin/HR can perform bulk uploads"
        )
    
    # Validate file type
    allowed_extensions = ['.csv', '.xlsx', '.xls', '.pdf']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only CSV, Excel (.xlsx, .xls), and PDF files are allowed. Got: {file_extension}"
        )
    
    try:
        # Read file contents
        contents = await file.read()
        print(f"📄 File received: {file.filename}")
        print(f"📊 File size: {len(contents)} bytes")
        print(f"📋 File type: {file_extension}")
        
        import csv
        from io import StringIO, BytesIO
        
        # Process based on file type
        if file_extension == '.csv':
            # Process CSV file with encoding detection
            try:
                csv_data = contents.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    csv_data = contents.decode('latin-1')
                    print("⚠️  Using latin-1 encoding")
                except UnicodeDecodeError:
                    csv_data = contents.decode('utf-8', errors='ignore')
                    print("⚠️  Using utf-8 with error ignore")
            
            csv_file = StringIO(csv_data)
            csv_reader = csv.DictReader(csv_file)
            
            # Debug: Print headers
            csv_file_check = StringIO(csv_data)
            first_line = csv_file_check.readline()
            print(f"📋 CSV Headers: {first_line.strip()}")
            print(f"📊 Detected columns: {csv_reader.fieldnames if hasattr(csv_reader, 'fieldnames') else 'N/A'}")
            
        elif file_extension in ['.xlsx', '.xls']:
            # Process Excel file
            try:
                import pandas as pd
                excel_file = BytesIO(contents)
                df = pd.read_excel(excel_file)
                
                # Replace NaN with empty strings
                df = df.fillna('')
                
                # Convert DataFrame to list of dictionaries
                csv_reader = df.to_dict('records')
                
                # Debug: Print info
                print(f"📊 Excel columns: {list(df.columns)}")
                print(f"📊 Excel rows: {len(df)}")
                if len(df) > 0:
                    print(f"📋 First row sample: {df.iloc[0].to_dict()}")
                
            except ImportError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Excel processing not available. Please install pandas and openpyxl."
                )
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"❌ Excel processing error: {error_trace}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error reading Excel file: {str(e)}"
                )
                
        elif file_extension == '.pdf':
            # Process PDF file
            try:
                import PyPDF2
                import re
                
                pdf_file = BytesIO(contents)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                
                print(f"📄 PDF pages: {len(pdf_reader.pages)}")
                
                # Extract text from all pages
                text = ""
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    text += page_text
                    if page_num == 0:
                        print(f"📋 First page preview (first 200 chars): {page_text[:200]}")
                
                # Try to parse as CSV-like data
                # This is a simple implementation - PDF parsing can be complex
                lines = text.strip().split('\n')
                print(f"📊 PDF extracted lines: {len(lines)}")
                
                if len(lines) < 2:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"PDF file does not contain valid tabular data. Only {len(lines)} lines found."
                    )
                
                # Show first few lines for debugging
                print(f"📋 First 3 lines:")
                for i, line in enumerate(lines[:3]):
                    print(f"  Line {i+1}: {line}")
                
                # Parse as CSV
                csv_file = StringIO('\n'.join(lines))
                csv_reader = csv.DictReader(csv_file)
                
                # Check if headers were detected
                if not csv_reader.fieldnames:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Could not detect column headers in PDF. Please ensure the PDF has a proper table format."
                    )
                
                print(f"📊 PDF detected columns: {csv_reader.fieldnames}")
                
            except ImportError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="PDF processing not available. Please install PyPDF2."
                )
            except HTTPException:
                raise
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"❌ PDF processing error: {error_trace}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error reading PDF file: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_extension}"
            )
        
        created_count = 0
        error_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (1 is header)
            try:
                # Debug: Print row data
                print(f"Processing row {row_num}: {row}")
                
                # Validate required fields
                employee_id = str(row.get('employee_id', '')).strip()
                name = str(row.get('name', '')).strip()
                email = str(row.get('email', '')).strip()
                
                if not employee_id or not name or not email:
                    missing = []
                    if not employee_id: missing.append('employee_id')
                    if not name: missing.append('name')
                    if not email: missing.append('email')
                    errors.append(f"Row {row_num}: Missing required fields: {', '.join(missing)}")
                    error_count += 1
                    continue
                
                # Check if employee already exists
                existing = get_user_by_employee_id(db, employee_id)
                if existing:
                    errors.append(f"Row {row_num}: Employee ID '{employee_id}' already exists")
                    error_count += 1
                    continue
                
                # Check if email already exists
                existing_email = get_user_by_email(db, email)
                if existing_email:
                    errors.append(f"Row {row_num}: Email '{email}' already exists")
                    error_count += 1
                    continue
                
                # Parse role with validation
                role_str = str(row.get('role', 'EMPLOYEE')).strip().upper()
                try:
                    # Handle common role variations
                    role_mapping = {
                        'EMPLOYEE': RoleEnum.EMPLOYEE,
                        'ADMIN': RoleEnum.ADMIN,
                        'HR': RoleEnum.HR,
                        'MANAGER': RoleEnum.MANAGER,
                        'TEAM LEAD': RoleEnum.TEAM_LEAD,
                        'TEAMLEAD': RoleEnum.TEAM_LEAD,
                        'TEAM_LEAD': RoleEnum.TEAM_LEAD,
                    }
                    role = role_mapping.get(role_str, RoleEnum.EMPLOYEE)
                except Exception as e:
                    print(f"Role parsing error for '{role_str}': {e}")
                    role = RoleEnum.EMPLOYEE
                
                # Create user
                user_in = UserCreate(
                    employee_id=employee_id,
                    name=name,
                    email=email,
                    department=str(row.get('department', '')).strip() or None,
                    designation=str(row.get('designation', '')).strip() or None,
                    phone=str(row.get('phone', '')).strip() or None,
                    address=str(row.get('address', '')).strip() or None,
                    role=role,
                    gender=str(row.get('gender', '')).strip() or None,
                    shift_type=str(row.get('shift_type', '')).strip() or None,
                    employee_type=str(row.get('employee_type', '')).strip() or None,
                    pan_card=str(row.get('pan_card', '')).strip() or None,
                    aadhar_card=str(row.get('aadhar_card', '')).strip() or None,
                    profile_photo=None
                )
                
                create_user(db, user_in)
                created_count += 1
                print(f"✅ Created employee: {employee_id} - {name}")
                
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"❌ Error processing row {row_num}: {error_trace}")
                errors.append(f"Row {row_num}: {str(e)}")
                error_count += 1
        
        return {
            "success": True,
            "created": created_count,
            "errors": error_count,
            "error_details": errors if errors else None,
            "message": f"Successfully created {created_count} employees. {error_count} errors."
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Bulk upload error: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file ({file_extension}): {str(e)}"
        )


# ✅ Delete employee (requires authentication)
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_employee(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ Only requires login, no role check
):
    # Optional: Allow users to delete only themselves, or Admin/HR to delete anyone
    if current_user.user_id != user_id and current_user.role not in [RoleEnum.ADMIN, RoleEnum.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. Only Admin/HR can delete other employees."
        )
    
    employee = delete_user(db, user_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return None

# ✅ Get current user's own profile (any authenticated user)
@router.get("/me", response_model=UserOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the profile of the currently logged-in user"""
    employee = get_user(db, current_user.user_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _sanitize_users_response(employee)

# ✅ Admin & HR: Get single employee by ID
@router.get("/{user_id}", response_model=UserOut)
def get_single_employee(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get employee by ID - users can view their own profile, Admin/HR can view anyone"""
    # Allow users to view their own profile OR Admin/HR to view anyone
    if current_user.user_id != user_id and current_user.role not in [RoleEnum.ADMIN, RoleEnum.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. You can only view your own profile."
        )
    
    employee = get_user(db, user_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _sanitize_users_response(employee)

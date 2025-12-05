from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.user import User
from app.schemas.department_schema import DepartmentOut, DepartmentCreate, DepartmentUpdate
from app.crud.department_crud import (
    list_departments,
    get_department,
    create_department,
    update_department,
    delete_department,
)
from app.dependencies import get_current_user, require_roles
from app.enums import RoleEnum


router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/", response_model=List[DepartmentOut])
def get_departments(
    db: Session = Depends(get_db),
    _: RoleEnum = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.HR)),
):
    return list_departments(db)


@router.post("/", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department_endpoint(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    _: RoleEnum = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.HR)),
):
    return create_department(db, dept_in)


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department_endpoint(
    dept_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    _: RoleEnum = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.HR)),
):
    dept = get_department(db, dept_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return update_department(db, dept, dept_in)


@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department_endpoint(
    dept_id: int,
    db: Session = Depends(get_db),
    _: RoleEnum = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.HR)),
):
    dept = get_department(db, dept_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    delete_department(db, dept)
    return None


@router.get("/managers")
def get_department_managers(
    db: Session = Depends(get_db),
    _: RoleEnum = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.HR)),
):
    managers = (
        db.query(User)
        .filter(User.role.in_([RoleEnum.MANAGER, RoleEnum.TEAM_LEAD]))
        .filter(User.is_active.is_(True))
        .order_by(User.name.asc())
        .all()
    )

    return [
        {
            "id": manager.user_id,
            "name": manager.name,
            "email": manager.email,
            "department": manager.department,
            "role": manager.role.value if hasattr(manager.role, "value") else manager.role,
        }
        for manager in managers
    ]


@router.post("/sync-from-users", status_code=status.HTTP_200_OK)
def sync_departments_from_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Automatically create departments based on unique department names from existing users.
    Only creates departments that don't already exist.
    """
    # Only Admin can sync departments
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can sync departments from users"
        )
    
    # Get all unique department names from users (excluding None/empty)
    user_departments = (
        db.query(User.department)
        .filter(User.department.isnot(None))
        .filter(User.department != "")
        .distinct()
        .all()
    )
    
    # Get existing department names
    existing_departments = {dept.name.lower() for dept in list_departments(db)}
    
    created_count = 0
    created_departments = []
    
    for (dept_name,) in user_departments:
        if dept_name and dept_name.lower() not in existing_departments:
            # Count employees in this department
            employee_count = (
                db.query(User)
                .filter(User.department == dept_name)
                .count()
            )
            
            # Find a manager for this department (if any)
            manager = (
                db.query(User)
                .filter(User.department == dept_name)
                .filter(User.role.in_([RoleEnum.MANAGER, RoleEnum.HR]))
                .filter(User.is_active.is_(True))
                .first()
            )
            
            # Generate a code from department name
            code = "".join(word[0].upper() for word in dept_name.split()[:3]) or dept_name[:3].upper()
            
            # Create the department
            from app.schemas.department_schema import DepartmentCreate
            dept_in = DepartmentCreate(
                name=dept_name,
                code=code,
                manager_id=manager.user_id if manager else None,
                description=f"Auto-created from user data",
                status="active",
                employee_count=employee_count,
            )
            
            new_dept = create_department(db, dept_in)
            created_departments.append(new_dept.name)
            created_count += 1
            existing_departments.add(dept_name.lower())
    
    return {
        "success": True,
        "message": f"Synced {created_count} new departments from users",
        "created_departments": created_departments,
        "total_departments": len(existing_departments),
    }



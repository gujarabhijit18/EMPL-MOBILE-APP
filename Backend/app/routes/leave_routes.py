# app/routes/leave_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.crud.leave_crud import (
    apply_leave,
    approve_leave as approve_leave_db,
    list_leave,
    list_leave_by_period,
    update_leave as update_leave_db,
    delete_leave as delete_leave_db,
    list_pending_all,
    list_pending_by_department,
    list_pending_by_requester_roles,
    list_pending_by_department_and_roles,
    list_decided_by_approver,
    create_leave_request_notifications,
    create_leave_decision_notification,
    list_leave_notifications,
    mark_leave_notification_as_read,
    get_leave_balance,
)
from app.dependencies import get_current_user, require_roles
from app.schemas.leave_schema import (
    LeaveCreate,
    LeaveOut,
    LeaveWithUserOut,
    LeaveNotificationOut,
    LeaveUpdate,
    LeaveBalanceResponse,
)
from app.db.models.user import User
from app.db.models.leave import Leave
from fastapi import Body
from app.enums import RoleEnum

router = APIRouter(prefix="/leave", tags=["Leave"])

# Employee applies for leave
@router.post("/", response_model=LeaveOut)
def request_leave(
    leave: LeaveCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    start_dt = datetime.combine(leave.start_date, datetime.min.time())
    end_dt = datetime.combine(leave.end_date, datetime.min.time())
    new_leave = apply_leave(
        db,
        user.user_id,
        start_dt,
        end_dt,
        leave.reason,
        leave.leave_type.lower(),
    )
    # Create notifications for appropriate recipients based on department and role
    create_leave_request_notifications(db, new_leave, user)
    return new_leave


# Manager/Admin can approve leave
@router.post("/{leave_id}/approve", response_model=LeaveOut)
def approve_leave_request(
    leave_id: int,
    comments: str = Body(default="Approved", embed=True),
    db: Session = Depends(get_db),
    user=Depends(require_roles("Manager", "Admin", "HR"))
):
    leave = approve_leave_db(db, leave_id, approver_id=user.user_id, comments=comments)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    create_leave_decision_notification(db, leave=leave, approver=user, approved=True)
    return leave

# Manager/Admin can reject leave
@router.post("/{leave_id}/reject", response_model=LeaveOut)
def reject_leave_request(
    leave_id: int,
    rejection_reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    user=Depends(require_roles("Manager", "Admin", "HR"))
):
    from app.crud.leave_crud import reject_leave
    leave = reject_leave(db, leave_id, approver_id=user.user_id, rejection_reason=rejection_reason)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    create_leave_decision_notification(db, leave=leave, approver=user, approved=False)
    return leave


# View logged-in user's leave requests
@router.get("/", response_model=list[LeaveOut])
def view_my_leave(
    period: str = Query(default="current_month", description="Time period: current_month, last_3_months, last_6_months, last_1_year"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Get user's leave history filtered by time period.
    Default: current_month
    Options: current_month, last_3_months, last_6_months, last_1_year
    """
    if period in ["current_month", "last_3_months", "last_6_months", "last_1_year"]:
        return list_leave_by_period(db, user.user_id, period)
    else:
        # Default to current month if invalid period
        return list_leave_by_period(db, user.user_id, "current_month")


@router.get("/balance", response_model=LeaveBalanceResponse)
def leave_balance(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    balances = get_leave_balance(db, user.user_id)
    return {"balances": balances}


@router.put("/{leave_id}", response_model=LeaveOut)
def update_leave_request(
    leave_id: int,
    leave_update: LeaveUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    start_date = None
    end_date = None
    leave_type = None
    if leave_update.start_date:
        start_date = datetime.combine(leave_update.start_date, datetime.min.time())
    if leave_update.end_date:
        end_date = datetime.combine(leave_update.end_date, datetime.min.time())
    if leave_update.leave_type:
        leave_type = leave_update.leave_type.lower()

    updated_leave = update_leave_db(
        db,
        leave_id,
        user.user_id,
        start_date=start_date,
        end_date=end_date,
        reason=leave_update.reason,
        leave_type=leave_type,
    )

    if updated_leave is None:
        raise HTTPException(status_code=404, detail="Leave not found")
    if updated_leave == "not_pending":
        raise HTTPException(status_code=400, detail="Only pending leave requests can be updated")

    return updated_leave


@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    result = delete_leave_db(db, leave_id, user.user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Leave not found")
    if result == "not_pending":
        raise HTTPException(status_code=400, detail="Only pending leave requests can be deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================================
# NEW ROLE-BASED ENDPOINTS WITH STRICT DEPARTMENT ISOLATION
# ============================================================================

# Get all leaves (Admin only - all departments, all roles)
@router.get("/all", response_model=list[LeaveWithUserOut])
def get_all_leaves(
    db: Session = Depends(get_db),
    user=Depends(require_roles("Admin"))
):
    """Admin only: View all leave requests from all departments and roles"""
    all_leaves = db.query(Leave).order_by(Leave.created_at.desc()).all()
    
    results = []
    for leave in all_leaves:
        u: User = leave.user
        days = (leave.end_date.date() - leave.start_date.date()).days + 1
        results.append({
            "leave_id": leave.leave_id,
            "user_id": leave.user_id,
            "start_date": leave.start_date.date(),
            "end_date": leave.end_date.date(),
            "reason": leave.reason,
            "status": leave.status,
            "leave_type": (leave.leave_type or "annual").lower(),
            "type": (leave.leave_type or "annual").lower(),
            "employee_id": u.employee_id if u else "",
            "name": u.name if u else "",
            "department": u.department if u else None,
            "role": str(u.role) if u and u.role else None,
            "profile_photo": u.profile_photo if u else None,
            "email": u.email if u else None,
            "days": days,
            "created_at": leave.created_at if hasattr(leave, 'created_at') else None,
            "approved_by": leave.approved_by if hasattr(leave, 'approved_by') else None,
            "approved_at": leave.approved_at if hasattr(leave, 'approved_at') else None,
            "rejection_reason": leave.rejection_reason if hasattr(leave, 'rejection_reason') else None,
            "comments": leave.comments if hasattr(leave, 'comments') else None,
        })
    return results


# Get department leaves (HR/Manager only - their department, Employee/TeamLead only)
@router.get("/department", response_model=list[LeaveWithUserOut])
def get_department_leaves(
    db: Session = Depends(get_db),
    user=Depends(require_roles("HR", "Manager"))
):
    """HR/Manager only: View leave requests from Employee/TeamLead in their department"""
    if not user.department:
        raise HTTPException(status_code=400, detail="User has no department assigned")
    
    # Get Employee and TeamLead leaves from user's department only
    department_leaves = (
        db.query(Leave)
        .join(User, User.user_id == Leave.user_id)
        .filter(
            User.department == user.department,
            User.role.in_([RoleEnum.EMPLOYEE, RoleEnum.TEAM_LEAD])
        )
        .order_by(Leave.created_at.desc())
        .all()
    )
    
    results = []
    for leave in department_leaves:
        u: User = leave.user
        days = (leave.end_date.date() - leave.start_date.date()).days + 1
        results.append({
            "leave_id": leave.leave_id,
            "user_id": leave.user_id,
            "start_date": leave.start_date.date(),
            "end_date": leave.end_date.date(),
            "reason": leave.reason,
            "status": leave.status,
            "leave_type": (leave.leave_type or "annual").lower(),
            "type": (leave.leave_type or "annual").lower(),
            "employee_id": u.employee_id if u else "",
            "name": u.name if u else "",
            "department": u.department if u else None,
            "role": str(u.role) if u and u.role else None,
            "profile_photo": u.profile_photo if u else None,
            "email": u.email if u else None,
            "days": days,
            "created_at": leave.created_at if hasattr(leave, 'created_at') else None,
            "approved_by": leave.approved_by if hasattr(leave, 'approved_by') else None,
            "approved_at": leave.approved_at if hasattr(leave, 'approved_at') else None,
            "rejection_reason": leave.rejection_reason if hasattr(leave, 'rejection_reason') else None,
            "comments": leave.comments if hasattr(leave, 'comments') else None,
        })
    return results


# Get my leaves (TeamLead/Employee - own leaves only)
@router.get("/my", response_model=list[LeaveOut])
def get_my_leaves_only(
    period: str = Query(default="last_1_year", description="Time period filter"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get current user's own leave requests only"""
    return list_leave_by_period(db, user.user_id, period)


# ============================================================================
# LEGACY ENDPOINTS (Kept for backward compatibility)
# ============================================================================

# Approvals inbox for approvers based on hierarchy
@router.get("/approvals", response_model=list[LeaveWithUserOut])
def approvals_inbox(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Admin sees HR/Manager requests from ALL departments
    role_value = getattr(user.role, "value", str(user.role))
    if role_value == RoleEnum.ADMIN.value:
        # Admin approves HR and Manager leave requests (all departments)
        pending = list_pending_by_requester_roles(db, [RoleEnum.HR.value, RoleEnum.MANAGER.value])
    elif role_value in (RoleEnum.HR.value, RoleEnum.MANAGER.value):
        if not user.department:
            return []
        # HR/Manager see only Employee/TeamLead requests from their department
        pending = list_pending_by_department_and_roles(db, user.department, [RoleEnum.EMPLOYEE.value, RoleEnum.TEAM_LEAD.value])
    else:
        return []

    # enrich with user details
    results = []
    for leave in pending:
        u: User = leave.user
        # Calculate days
        days = (leave.end_date.date() - leave.start_date.date()).days + 1
        results.append({
            "leave_id": leave.leave_id,
            "user_id": leave.user_id,
            "start_date": leave.start_date.date(),
            "end_date": leave.end_date.date(),
            "reason": leave.reason,
            "status": leave.status,
            "leave_type": (leave.leave_type or "annual").lower(),
            "type": (leave.leave_type or "annual").lower(),
            "employee_id": u.employee_id if u else "",
            "name": u.name if u else "",
            "department": u.department if u else None,
            "role": str(u.role) if u and u.role else None,
            "profile_photo": u.profile_photo if u else None,
            "email": u.email if u else None,
            "days": days,
            "created_at": leave.created_at if hasattr(leave, 'created_at') else None,
            "approved_by": leave.approved_by if hasattr(leave, 'approved_by') else None,
            "approved_at": leave.approved_at if hasattr(leave, 'approved_at') else None,
            "rejection_reason": leave.rejection_reason if hasattr(leave, 'rejection_reason') else None,
            "comments": leave.comments if hasattr(leave, 'comments') else None,
        })
    return results


# Approver's decision history
@router.get("/approvals/history", response_model=list[LeaveWithUserOut])
def approvals_history(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Admin sees decided HR/Manager leaves from all departments
    # HR/Manager see decided Employee/TeamLead leaves from their department
    role_value = getattr(user.role, "value", str(user.role))
    if role_value == RoleEnum.ADMIN.value:
        # Get decided HR/Manager leaves (all departments)
        decided = (
            db.query(Leave)
            .join(User, User.user_id == Leave.user_id)
            .filter(
                Leave.status != "Pending",
                User.role.in_([RoleEnum.HR, RoleEnum.MANAGER])
            )
            .order_by(Leave.end_date.desc())
            .all()
        )
    elif role_value in (RoleEnum.HR.value, RoleEnum.MANAGER.value):
        if not user.department:
            decided = []
        else:
            # Get decided Employee/TeamLead leaves from their department
            decided = (
                db.query(Leave)
                .join(User, User.user_id == Leave.user_id)
                .filter(
                    Leave.status != "Pending",
                    User.department == user.department,
                    User.role.in_([RoleEnum.EMPLOYEE, RoleEnum.TEAM_LEAD])
                )
                .order_by(Leave.end_date.desc())
                .all()
            )
    else:
        # Other roles see only leaves they decided
        decided = list_decided_by_approver(db, user.user_id)
    
    results: list[dict] = []
    for leave in decided:
        u: User = leave.user
        # Calculate days
        days = (leave.end_date.date() - leave.start_date.date()).days + 1
        results.append({
            "leave_id": leave.leave_id,
            "user_id": leave.user_id,
            "start_date": leave.start_date.date(),
            "end_date": leave.end_date.date(),
            "reason": leave.reason,
            "status": leave.status,
            "leave_type": (leave.leave_type or "annual").lower(),
            "type": (leave.leave_type or "annual").lower(),
            "employee_id": u.employee_id if u else "",
            "name": u.name if u else "",
            "department": u.department if u else None,
            "role": str(u.role) if u and u.role else None,
            "profile_photo": u.profile_photo if u else None,
            "email": u.email if u else None,
            "days": days,
            "created_at": leave.created_at if hasattr(leave, 'created_at') else None,
            "approved_by": leave.approved_by if hasattr(leave, 'approved_by') else None,
            "approved_at": leave.approved_at if hasattr(leave, 'approved_at') else None,
            "rejection_reason": leave.rejection_reason if hasattr(leave, 'rejection_reason') else None,
            "comments": leave.comments if hasattr(leave, 'comments') else None,
        })
    return results


# Leave notifications endpoints
@router.get("/notifications", response_model=list[LeaveNotificationOut])
def get_leave_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get all leave notifications for the current user."""
    notifications = list_leave_notifications(db, user.user_id)
    return notifications


@router.put("/notifications/{notification_id}/read", response_model=LeaveNotificationOut)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Mark a leave notification as read."""
    notification = mark_leave_notification_as_read(db, notification_id, user.user_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

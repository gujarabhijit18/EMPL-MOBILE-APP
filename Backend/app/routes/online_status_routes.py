"""
Online/Offline Status Routes - Add-on to existing attendance system.
Does NOT modify check-in/check-out logic.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

from app.db.database import get_db
from app.db.models.attendance import Attendance
from app.db.models.online_status import OnlineStatus, OnlineStatusLog
from app.db.models.user import User
from app.schemas.online_status_schema import (
    OnlineStatusOut,
    OnlineStatusSummary,
    OnlineStatusLogOut,
    ToggleStatusRequest,
    ToggleStatusResponse,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/online-status", tags=["Online Status"])
logger = logging.getLogger(__name__)

INDIA_TZ = ZoneInfo("Asia/Kolkata")
UTC_TZ = ZoneInfo("UTC")


def _calculate_duration_minutes(start: datetime, end: datetime) -> float:
    """Calculate duration in minutes between two timestamps."""
    if not start or not end:
        return 0.0
    delta = end - start
    return round(delta.total_seconds() / 60, 2)


def _get_today_attendance(db: Session, user_id: int) -> Optional[Attendance]:
    """Get today's active attendance record (checked in, not checked out)."""
    india_now = datetime.now(INDIA_TZ)
    today_start = india_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start.astimezone(UTC_TZ).replace(tzinfo=None)
    
    return (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user_id,
            Attendance.check_in >= today_start_utc,
            Attendance.check_out.is_(None)
        )
        .order_by(Attendance.check_in.desc())
        .first()
    )


def _get_or_create_online_status(db: Session, user_id: int, attendance_id: int) -> OnlineStatus:
    """Get existing online status or create new one (defaults to Online)."""
    online_status = (
        db.query(OnlineStatus)
        .filter(
            OnlineStatus.user_id == user_id,
            OnlineStatus.attendance_id == attendance_id
        )
        .first()
    )
    
    if not online_status:
        # Create new online status (default: Online)
        online_status = OnlineStatus(
            user_id=user_id,
            attendance_id=attendance_id,
            is_online=True
        )
        db.add(online_status)
        db.flush()
        
        # Create initial "online" log entry
        initial_log = OnlineStatusLog(
            user_id=user_id,
            attendance_id=attendance_id,
            online_status_id=online_status.id,
            status="online",
            started_at=datetime.utcnow()
        )
        db.add(initial_log)
        db.commit()
        db.refresh(online_status)
        logger.info(f"Created new online status for user {user_id}, attendance {attendance_id}")
    
    return online_status


def _calculate_time_summary(db: Session, online_status_id: int) -> dict:
    """Calculate total online and offline time from logs."""
    logs = (
        db.query(OnlineStatusLog)
        .filter(OnlineStatusLog.online_status_id == online_status_id)
        .order_by(OnlineStatusLog.started_at)
        .all()
    )
    
    total_online = 0.0
    total_offline = 0.0
    offline_count = 0
    
    for log in logs:
        if log.ended_at:
            duration = _calculate_duration_minutes(log.started_at, log.ended_at)
        else:
            # Current active session
            duration = _calculate_duration_minutes(log.started_at, datetime.utcnow())
        
        if log.status == "online":
            total_online += duration
        else:
            total_offline += duration
            offline_count += 1
    
    return {
        "total_online_minutes": round(total_online, 2),
        "total_offline_minutes": round(total_offline, 2),
        "effective_work_hours": round(total_online / 60, 2),
        "offline_count": offline_count
    }


@router.get("/current/{user_id}", response_model=OnlineStatusOut)
def get_current_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current online/offline status for a user.
    Returns status only if user has an active attendance (checked in, not checked out).
    """
    # Check for active attendance
    attendance = _get_today_attendance(db, user_id)
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active attendance found. Please check in first."
        )
    
    # Get or create online status
    online_status = _get_or_create_online_status(db, user_id, attendance.attendance_id)
    
    # Calculate time summary
    summary = _calculate_time_summary(db, online_status.id)
    
    return OnlineStatusOut(
        id=online_status.id,
        user_id=online_status.user_id,
        attendance_id=online_status.attendance_id,
        is_online=online_status.is_online,
        created_at=online_status.created_at,
        updated_at=online_status.updated_at,
        total_online_minutes=summary["total_online_minutes"],
        total_offline_minutes=summary["total_offline_minutes"],
        current_session_minutes=summary["total_online_minutes"] if online_status.is_online else 0
    )


@router.post("/toggle/{user_id}", response_model=ToggleStatusResponse)
def toggle_status(
    user_id: int,
    request: ToggleStatusRequest,
    db: Session = Depends(get_db)
):
    """
    Toggle online/offline status for a user.
    - When going offline: offline_reason is REQUIRED
    - When going online: offline_reason is ignored
    - Only works if user has active attendance (not checked out)
    """
    # Check for active attendance
    attendance = _get_today_attendance(db, user_id)
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot toggle status. No active attendance found or already checked out."
        )
    
    # Get or create online status
    online_status = _get_or_create_online_status(db, user_id, attendance.attendance_id)
    
    # Determine new status (toggle)
    new_is_online = not online_status.is_online
    
    # Validate offline reason when going offline
    if not new_is_online and not request.offline_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Offline reason is required when switching to offline status."
        )
    
    try:
        # Close current log entry
        current_log = (
            db.query(OnlineStatusLog)
            .filter(
                OnlineStatusLog.online_status_id == online_status.id,
                OnlineStatusLog.ended_at.is_(None)
            )
            .first()
        )
        
        if current_log:
            current_log.ended_at = datetime.utcnow()
            current_log.duration_minutes = _calculate_duration_minutes(
                current_log.started_at, 
                current_log.ended_at
            )
        
        # Create new log entry
        new_log = OnlineStatusLog(
            user_id=user_id,
            attendance_id=attendance.attendance_id,
            online_status_id=online_status.id,
            status="online" if new_is_online else "offline",
            offline_reason=request.offline_reason if not new_is_online else None,
            started_at=datetime.utcnow()
        )
        db.add(new_log)
        
        # Update online status
        online_status.is_online = new_is_online
        online_status.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(online_status)
        
        # Calculate updated summary
        summary = _calculate_time_summary(db, online_status.id)
        
        status_text = "Online" if new_is_online else "Offline"
        logger.info(f"User {user_id} toggled to {status_text}")
        
        return ToggleStatusResponse(
            success=True,
            message=f"Status changed to {status_text}",
            is_online=new_is_online,
            total_online_minutes=summary["total_online_minutes"],
            total_offline_minutes=summary["total_offline_minutes"],
            effective_work_hours=summary["effective_work_hours"]
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling status for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle status: {str(e)}"
        )


@router.get("/summary/{user_id}", response_model=OnlineStatusSummary)
def get_status_summary(
    user_id: int,
    attendance_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get detailed summary of online/offline time for a user's attendance session.
    If attendance_id is not provided, uses today's active attendance.
    """
    if attendance_id:
        attendance = db.query(Attendance).filter(
            Attendance.attendance_id == attendance_id,
            Attendance.user_id == user_id
        ).first()
    else:
        attendance = _get_today_attendance(db, user_id)
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No attendance record found."
        )
    
    online_status = (
        db.query(OnlineStatus)
        .filter(
            OnlineStatus.user_id == user_id,
            OnlineStatus.attendance_id == attendance.attendance_id
        )
        .first()
    )
    
    if not online_status:
        # No online status tracking for this attendance
        return OnlineStatusSummary(
            user_id=user_id,
            attendance_id=attendance.attendance_id,
            is_online=True,  # Default assumption
            total_online_minutes=0,
            total_offline_minutes=0,
            effective_work_hours=0,
            offline_count=0,
            logs=[]
        )
    
    # Get all logs
    logs = (
        db.query(OnlineStatusLog)
        .filter(OnlineStatusLog.online_status_id == online_status.id)
        .order_by(OnlineStatusLog.started_at)
        .all()
    )
    
    # Calculate summary
    summary = _calculate_time_summary(db, online_status.id)
    
    return OnlineStatusSummary(
        user_id=user_id,
        attendance_id=attendance.attendance_id,
        is_online=online_status.is_online,
        total_online_minutes=summary["total_online_minutes"],
        total_offline_minutes=summary["total_offline_minutes"],
        effective_work_hours=summary["effective_work_hours"],
        offline_count=summary["offline_count"],
        logs=[OnlineStatusLogOut.model_validate(log) for log in logs]
    )


@router.get("/logs/{user_id}")
def get_status_logs(
    user_id: int,
    attendance_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all status change logs for a user's attendance session."""
    if attendance_id:
        attendance = db.query(Attendance).filter(
            Attendance.attendance_id == attendance_id,
            Attendance.user_id == user_id
        ).first()
    else:
        attendance = _get_today_attendance(db, user_id)
    
    if not attendance:
        return []
    
    online_status = (
        db.query(OnlineStatus)
        .filter(
            OnlineStatus.user_id == user_id,
            OnlineStatus.attendance_id == attendance.attendance_id
        )
        .first()
    )
    
    if not online_status:
        return []
    
    logs = (
        db.query(OnlineStatusLog)
        .filter(OnlineStatusLog.online_status_id == online_status.id)
        .order_by(OnlineStatusLog.started_at.desc())
        .all()
    )
    
    return [
        {
            "id": log.id,
            "status": log.status,
            "offline_reason": log.offline_reason,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "ended_at": log.ended_at.isoformat() if log.ended_at else None,
            "duration_minutes": log.duration_minutes
        }
        for log in logs
    ]


@router.post("/finalize/{user_id}")
def finalize_status_on_checkout(
    user_id: int,
    attendance_id: int,
    db: Session = Depends(get_db)
):
    """
    Called internally when user checks out.
    Closes any open status logs and calculates final work hours.
    """
    online_status = (
        db.query(OnlineStatus)
        .filter(
            OnlineStatus.user_id == user_id,
            OnlineStatus.attendance_id == attendance_id
        )
        .first()
    )
    
    if not online_status:
        return {"message": "No online status to finalize", "effective_work_hours": 0}
    
    # Close any open log
    open_log = (
        db.query(OnlineStatusLog)
        .filter(
            OnlineStatusLog.online_status_id == online_status.id,
            OnlineStatusLog.ended_at.is_(None)
        )
        .first()
    )
    
    if open_log:
        open_log.ended_at = datetime.utcnow()
        open_log.duration_minutes = _calculate_duration_minutes(
            open_log.started_at,
            open_log.ended_at
        )
    
    # Set status to offline (checked out)
    online_status.is_online = False
    online_status.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Calculate final summary
    summary = _calculate_time_summary(db, online_status.id)
    
    return {
        "message": "Status finalized on checkout",
        "effective_work_hours": summary["effective_work_hours"],
        "total_online_minutes": summary["total_online_minutes"],
        "total_offline_minutes": summary["total_offline_minutes"]
    }

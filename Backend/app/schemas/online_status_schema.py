"""
Pydantic schemas for Online/Offline Status feature.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class OnlineStatusBase(BaseModel):
    """Base schema for online status"""
    is_online: bool = True


class OnlineStatusCreate(OnlineStatusBase):
    """Schema for creating online status (auto-created on check-in)"""
    user_id: int
    attendance_id: int


class OnlineStatusUpdate(BaseModel):
    """Schema for updating online status (toggle)"""
    is_online: bool
    offline_reason: Optional[str] = Field(None, description="Required when going offline")


class OnlineStatusOut(OnlineStatusBase):
    """Schema for online status response"""
    id: int
    user_id: int
    attendance_id: int
    is_online: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Calculated fields
    total_online_minutes: Optional[float] = 0.0
    total_offline_minutes: Optional[float] = 0.0
    current_session_minutes: Optional[float] = 0.0

    class Config:
        from_attributes = True


class OnlineStatusLogBase(BaseModel):
    """Base schema for status log"""
    status: str
    offline_reason: Optional[str] = None


class OnlineStatusLogCreate(OnlineStatusLogBase):
    """Schema for creating status log entry"""
    user_id: int
    attendance_id: int
    online_status_id: int


class OnlineStatusLogOut(OnlineStatusLogBase):
    """Schema for status log response"""
    id: int
    user_id: int
    attendance_id: int
    online_status_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: float = 0.0

    class Config:
        from_attributes = True


class OnlineStatusSummary(BaseModel):
    """Summary of online/offline time for a work session"""
    user_id: int
    attendance_id: int
    is_online: bool
    total_online_minutes: float
    total_offline_minutes: float
    effective_work_hours: float  # Only online time counts
    offline_count: int  # Number of times went offline
    logs: List[OnlineStatusLogOut] = []


class ToggleStatusRequest(BaseModel):
    """Request schema for toggling online/offline status"""
    offline_reason: Optional[str] = Field(
        None, 
        description="Required when switching to offline. Reason for going offline."
    )


class ToggleStatusResponse(BaseModel):
    """Response schema for toggle status"""
    success: bool
    message: str
    is_online: bool
    total_online_minutes: float
    total_offline_minutes: float
    effective_work_hours: float

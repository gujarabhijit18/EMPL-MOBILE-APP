"""
Online/Offline Status Model for tracking employee work status during attendance.
This is an add-on to the existing attendance system - does not modify check-in/check-out logic.
"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Float, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime


class OnlineStatus(Base):
    """
    Tracks online/offline status changes for an employee during their work session.
    - Created automatically when employee checks in (status = Online)
    - Updated when employee toggles status
    - Disabled/hidden after checkout
    """
    __tablename__ = "online_statuses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    attendance_id = Column(Integer, ForeignKey("attendances.attendance_id", ondelete="CASCADE"), nullable=False)
    
    # Current status: True = Online, False = Offline
    is_online = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="online_statuses")
    attendance = relationship("Attendance", backref="online_statuses")


class OnlineStatusLog(Base):
    """
    Logs each online/offline status change with reason and duration tracking.
    Used to calculate actual working hours (only Online time counts).
    """
    __tablename__ = "online_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    attendance_id = Column(Integer, ForeignKey("attendances.attendance_id", ondelete="CASCADE"), nullable=False)
    online_status_id = Column(Integer, ForeignKey("online_statuses.id", ondelete="CASCADE"), nullable=False)
    
    # Status change details
    status = Column(String(20), nullable=False)  # "online" or "offline"
    offline_reason = Column(Text, nullable=True)  # Required when going offline
    
    # Time tracking
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)  # Set when status changes
    duration_minutes = Column(Float, default=0.0)  # Calculated when ended_at is set
    
    # Relationships
    user = relationship("User", backref="online_status_logs")
    attendance = relationship("Attendance", backref="online_status_logs")
    online_status = relationship("OnlineStatus", backref="logs")

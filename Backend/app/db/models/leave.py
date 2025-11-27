from sqlalchemy import Column, Integer, DateTime, String, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Leave(Base):
    __tablename__ = "leaves"
    leave_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(String(255))
    status = Column(String(50), default="Pending")
    leave_type = Column(String(50), default="annual")
    
    # Additional fields for better tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)

    # Relationships with explicit foreign_keys to avoid ambiguity
    user = relationship("User", foreign_keys=[user_id], back_populates="leaves")
    approver = relationship("User", foreign_keys=[approved_by])
    notifications = relationship("LeaveNotification", back_populates="leave", cascade="all, delete-orphan")

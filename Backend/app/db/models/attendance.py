from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Float, func, Text
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime

class Attendance(Base):
    __tablename__ = "attendances"

    attendance_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    check_in = Column(DateTime(timezone=True), nullable=False)
    check_out = Column(DateTime(timezone=True), nullable=True)
    total_hours = Column(Float, default=0.0)  # Total hours worked today
    gps_location = Column(String(255), nullable=True)
    # Selfie data stored as JSON with check_in and check_out paths
    # Format: {"check_in": "path/to/checkin.jpg", "check_out": "path/to/checkout.jpg"}
    # IMPORTANT: This data is preserved indefinitely for historical records
    selfie = Column(String(1024), nullable=True)
    work_summary = Column(Text, nullable=True)
    work_report = Column(String(1024), nullable=True)

    user = relationship("User", back_populates="attendances")

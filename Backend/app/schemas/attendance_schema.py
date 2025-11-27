from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, Union
from datetime import datetime
import json

class LocationData(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    place_name: Optional[str] = None
    accuracy: Optional[float] = None
    timestamp: Optional[datetime] = None

    def to_dict(self):
        return {
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'place_name': self.place_name,
            'accuracy': self.accuracy,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class AttendanceBase(BaseModel):
    gps_location: Optional[Union[Dict[str, Any], str]] = None
    selfie: Optional[str] = None
    checkInSelfie: Optional[str] = None
    checkOutSelfie: Optional[str] = None
    location_data: Optional[Union[Dict[str, Any], str]] = None

class AttendanceOut(AttendanceBase):
    attendance_id: int
    user_id: int
    employee_id: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    check_in: datetime
    check_out: Optional[datetime] = None
    total_hours: float
    work_summary: Optional[str] = None
    workSummary: Optional[str] = None
    work_report: Optional[str] = None
    workReport: Optional[str] = None
    locationLabel: Optional[str] = None
    checkInLocationLabel: Optional[str] = None
    checkOutLocationLabel: Optional[str] = None

    class Config:
        from_attributes = True

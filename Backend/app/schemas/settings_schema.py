# Backend/app/schemas/settings_schema.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SettingsBase(BaseModel):
    theme_mode: str = Field(default="system", description="Display mode: light, dark, system")
    color_theme: str = Field(default="default", description="Color theme: default, purple, green, orange, pink, cyan")
    language: str = Field(default="en", description="Language: en, hi, mr")
    email_notifications: bool = Field(default=True)
    push_notifications: bool = Field(default=True)
    two_factor_enabled: bool = Field(default=False)


class SettingsCreate(SettingsBase):
    user_id: int


class SettingsUpdate(BaseModel):
    theme_mode: Optional[str] = None
    color_theme: Optional[str] = None
    language: Optional[str] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    two_factor_enabled: Optional[bool] = None


class SettingsOut(SettingsBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

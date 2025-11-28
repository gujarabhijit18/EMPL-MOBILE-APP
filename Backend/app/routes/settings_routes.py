# Backend/app/routes/settings_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.settings_schema import SettingsOut, SettingsUpdate
from app.crud.settings_crud import (
    get_or_create_settings,
    update_settings,
)
from app.db.database import get_db
from app.dependencies import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/me", response_model=SettingsOut, summary="Get current user's settings")
def get_my_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get settings for the currently logged-in user"""
    settings = get_or_create_settings(db, current_user.user_id)
    return settings


@router.put("/me", response_model=SettingsOut, summary="Update current user's settings")
def update_my_settings(
    settings_data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update settings for the currently logged-in user"""
    # Validate theme_mode
    if settings_data.theme_mode and settings_data.theme_mode not in ["light", "dark", "system"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid theme_mode. Must be 'light', 'dark', or 'system'"
        )
    
    # Validate color_theme
    valid_colors = ["default", "purple", "green", "orange", "pink", "cyan"]
    if settings_data.color_theme and settings_data.color_theme not in valid_colors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid color_theme. Must be one of: {', '.join(valid_colors)}"
        )
    
    # Validate language
    valid_languages = ["en", "hi", "mr"]
    if settings_data.language and settings_data.language not in valid_languages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid language. Must be one of: {', '.join(valid_languages)}"
        )
    
    settings = update_settings(db, current_user.user_id, settings_data)
    return settings


# Public endpoint for getting settings by user_id (for testing/admin)
@router.get("/{user_id}", response_model=SettingsOut, summary="Get settings by user ID")
def get_user_settings(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get settings for a specific user (public endpoint for testing)"""
    settings = get_or_create_settings(db, user_id)
    return settings


@router.put("/{user_id}", response_model=SettingsOut, summary="Update settings by user ID")
def update_user_settings(
    user_id: int,
    settings_data: SettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update settings for a specific user (public endpoint for testing)"""
    settings = update_settings(db, user_id, settings_data)
    return settings

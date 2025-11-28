# Backend/app/crud/settings_crud.py
from sqlalchemy.orm import Session
from app.db.models.settings import UserSettings
from app.schemas.settings_schema import SettingsCreate, SettingsUpdate


def get_settings_by_user_id(db: Session, user_id: int) -> UserSettings:
    """Get settings for a specific user"""
    return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()


def create_settings(db: Session, settings: SettingsCreate) -> UserSettings:
    """Create new settings for a user"""
    db_settings = UserSettings(
        user_id=settings.user_id,
        theme_mode=settings.theme_mode,
        color_theme=settings.color_theme,
        language=settings.language,
        email_notifications=settings.email_notifications,
        push_notifications=settings.push_notifications,
        two_factor_enabled=settings.two_factor_enabled,
    )
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    return db_settings


def update_settings(db: Session, user_id: int, settings: SettingsUpdate) -> UserSettings:
    """Update settings for a user"""
    db_settings = get_settings_by_user_id(db, user_id)
    
    if not db_settings:
        # Create default settings if not exists
        db_settings = UserSettings(user_id=user_id)
        db.add(db_settings)
    
    # Update only provided fields
    update_data = settings.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_settings, field, value)
    
    db.commit()
    db.refresh(db_settings)
    return db_settings


def get_or_create_settings(db: Session, user_id: int) -> UserSettings:
    """Get settings for a user, create default if not exists"""
    settings = get_settings_by_user_id(db, user_id)
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def delete_settings(db: Session, user_id: int) -> bool:
    """Delete settings for a user"""
    settings = get_settings_by_user_id(db, user_id)
    if settings:
        db.delete(settings)
        db.commit()
        return True
    return False

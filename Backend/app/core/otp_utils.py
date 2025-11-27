import random
from datetime import datetime, timedelta
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

OTP_STORE = {}

def generate_otp(email: str) -> int:
    """Generate a random 6-digit OTP for all environments"""
    # Always generate random OTP (no more fixed testing OTP)
    otp = random.randint(100000, 999999)
    logger.info(f"Generated OTP {otp} for email {email} in {settings.ENVIRONMENT} environment")
    
    OTP_STORE[email] = {
        "otp": otp, 
        "expiry": datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES),
        "environment": settings.ENVIRONMENT
    }
    return otp

def verify_otp(email: str, otp: int) -> bool:
    """Verify OTP - must match the stored random OTP and not be expired"""
    record = OTP_STORE.get(email)
    
    if not record:
        logger.warning(f"No OTP record found for email {email}")
        return False
    
    # Verify the actual stored OTP
    if record["otp"] != otp:
        logger.warning(f"Invalid OTP {otp} for email {email}. Expected {record['otp']}")
        return False
    
    # Check expiry
    if datetime.utcnow() > record["expiry"]:
        logger.warning(f"OTP expired for email {email}")
        del OTP_STORE[email]
        return False
    
    logger.info(f"OTP verified successfully for email {email} in {settings.ENVIRONMENT}")
    del OTP_STORE[email]
    return True

def get_otp_info(email: str) -> dict:
    """Get OTP information for debugging (only in non-production)"""
    if settings.is_production:
        return {"error": "OTP info not available in production"}
    
    record = OTP_STORE.get(email)
    if not record:
        return {"error": "No OTP found"}
    
    return {
        "email": email,
        "otp": record["otp"],
        "expiry": record["expiry"].isoformat(),
        "environment": record["environment"],
        "is_expired": datetime.utcnow() > record["expiry"],
        "time_remaining": max(0, (record["expiry"] - datetime.utcnow()).total_seconds())
    }

def clear_all_otps():
    """Clear all OTPs (useful for testing)"""
    global OTP_STORE
    OTP_STORE.clear()
    logger.info("All OTPs cleared")

def get_environment_info() -> dict:
    """Get current environment information for debugging"""
    return {
        "environment": settings.ENVIRONMENT,
        "should_send_email": settings.should_send_email,
        "enable_email_otp": settings.ENABLE_EMAIL_OTP,
        "otp_expiry_minutes": settings.OTP_EXPIRY_MINUTES,
        "active_otps": len(OTP_STORE),
    }

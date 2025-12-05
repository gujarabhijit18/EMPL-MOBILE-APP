from fastapi import Depends, HTTPException, status, Request
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.db.database import get_db
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.core.config import settings
from app.enums import RoleEnum
from typing import Optional

# Use HTTPBearer for better cross-platform compatibility (iOS/Android)
security = HTTPBearer(auto_error=False)

# Fallback: Also support APIKeyHeader for backward compatibility
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    api_key: Optional[str] = Depends(api_key_header),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and validate JWT token from Authorization header.
    Supports both 'Bearer <token>' format and raw token.
    Cross-platform compatible (iOS, Android, Web).
    """
    token = None
    
    # Debug logging
    print(f"🔐 Auth Debug - HTTPBearer credentials: {bool(credentials)}")
    print(f"🔐 Auth Debug - APIKeyHeader value: {api_key[:50] if api_key else 'None'}...")
    
    # Try HTTPBearer first (preferred method)
    if credentials and credentials.credentials:
        token = credentials.credentials
        print(f"🔐 Using HTTPBearer token")
    # Fallback to APIKeyHeader
    elif api_key:
        if api_key.startswith("Bearer "):
            token = api_key.split(" ", 1)[1]
            print(f"🔐 Using APIKeyHeader with Bearer prefix")
        else:
            token = api_key
            print(f"🔐 Using APIKeyHeader without Bearer prefix")
    
    if not token:
        print(f"❌ No token found in request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    print(f"🔐 Token received: {token[:30]}...")

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        print(f"🔐 Token decoded, email: {email}")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid token payload - missing subject",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError as e:
        print(f"❌ JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"❌ User not found for email: {email}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    print(f"✅ User authenticated: {user.name} ({user.role})")
    return user

def require_roles(*roles: RoleEnum):
    def wrapper(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return wrapper

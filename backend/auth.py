import hmac
import hashlib
import json
import base64
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

SECRET_KEY = "manas-multimodal-agent-secret-key-super-secure"
ALGORITHM = "HS256"
TOKEN_EXPIRE_SECONDS = 86400 * 7 # 7 days

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Generate salted SHA-256 hash."""
    salt = "manas_salt_2026_"
    return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict) -> str:
    """Create signed HMAC-SHA256 token."""
    payload = data.copy()
    payload["exp"] = int(time.time()) + TOKEN_EXPIRE_SECONDS
    payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{payload_b64}.{sig_b64}"

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify signed HMAC-SHA256 token."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        
        # Verify signature
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8').rstrip('=')
        
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
        
        # Add padding back if necessary
        padded = payload_b64 + '=' * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8'))
        
        # Check expiration
        if payload.get("exp", 0) < int(time.time()):
            return None
        
        return payload
    except Exception:
        return None

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload["sub"]
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


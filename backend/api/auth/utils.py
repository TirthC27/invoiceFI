"""
Authentication utilities.

Handles JWT token management and signature verification.
"""

from datetime import datetime, timedelta
from typing import Optional, Callable, List
from functools import wraps

from eth_account.messages import encode_defunct
from web3 import Web3
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config.settings import settings
from db.database import get_db
from db.models.user import User, UserRole, KYCStatus

# Security scheme
security = HTTPBearer()


def verify_signature(message: str, signature: str, expected_address: str) -> bool:
    """
    Verify an Ethereum signature.
    
    Args:
        message: The original message that was signed
        signature: The hex signature
        expected_address: The expected signer address
    
    Returns:
        True if signature is valid and from expected address
    """
    try:
        w3 = Web3()
        message_hash = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(
            message_hash,
            signature=signature
        )
        return recovered_address.lower() == expected_address.lower()
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data
        expires_delta: Optional custom expiration
    
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Payload data
    
    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str, is_refresh: bool = False) -> Optional[dict]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: The JWT token
        is_refresh: Whether this is a refresh token
    
    Returns:
        Decoded payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        token_type = payload.get("type")
        expected_type = "refresh" if is_refresh else "access"
        
        if token_type != expected_type:
            return None
        
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get current authenticated user.
    
    Args:
        credentials: HTTP Bearer credentials
        db: Database session
    
    Returns:
        Current user
    
    Raises:
        HTTPException: If authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise credentials_exception
    
    wallet_address = payload.get("sub")
    if wallet_address is None:
        raise credentials_exception
    
    result = await db.execute(
        select(User).where(User.wallet_address == wallet_address)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    return user


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory for role-based access control.
    
    IMPORTANT: Roles are stored server-side and NOT mocked.
    This is real authorization.
    
    Args:
        allowed_roles: Roles that are allowed access
    
    Returns:
        Dependency function that validates user role
    """
    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        # Admin has access to everything
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[r.value for r in allowed_roles]}",
            )
        
        return current_user
    
    return role_checker


def require_kyc(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to require completed KYC.
    
    IMPORTANT: KYC completion is enforced, NOT mocked.
    Users MUST complete KYC to access protected endpoints.
    
    Returns:
        Current user if KYC is complete
    
    Raises:
        HTTPException: If KYC is not complete
    """
    if not current_user.is_kyc_complete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC verification required. Please complete KYC to proceed.",
            headers={"X-KYC-Required": "true"},
        )
    
    return current_user


def require_kyc_and_role(*allowed_roles: UserRole):
    """
    Dependency factory requiring both KYC and specific role.
    
    Args:
        allowed_roles: Roles that are allowed access
    
    Returns:
        Dependency function that validates both KYC and role
    """
    async def kyc_role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        # Check KYC first
        if not current_user.is_kyc_complete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="KYC verification required. Please complete KYC to proceed.",
                headers={"X-KYC-Required": "true"},
            )
        
        # Admin bypass for role check
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Check role
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[r.value for r in allowed_roles]}",
            )
        
        return current_user
    
    return kyc_role_checker

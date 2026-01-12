"""
Authentication routes.

Handles wallet-based authentication with signature verification.
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.auth.schemas import (
    NonceRequest,
    NonceResponse,
    AuthRequest,
    AuthResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserResponse,
    RoleUpdateRequest,
)
from api.auth.utils import (
    verify_signature,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
    require_role,
    require_kyc,
)
from db.database import get_db
from db.models.user import User, UserRole, KYCStatus

router = APIRouter()


@router.post("/nonce", response_model=NonceResponse)
async def get_nonce(
    request: NonceRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a nonce for wallet signature.
    Creates user if not exists.
    """
    wallet_address = request.wallet_address.lower()
    
    # Find or create user
    result = await db.execute(
        select(User).where(User.wallet_address == wallet_address)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            wallet_address=wallet_address,
            role=UserRole.INVESTOR,  # Default role
            kyc_status=KYCStatus.NOT_STARTED,
        )
        db.add(user)
    
    # Generate new nonce
    nonce = secrets.token_hex(32)
    user.nonce = nonce
    await db.commit()
    
    message = f"Sign this message to authenticate with TERRA.\n\nNonce: {nonce}"
    
    return NonceResponse(
        nonce=nonce,
        message=message,
    )


@router.post("/verify", response_model=AuthResponse)
async def verify_wallet(
    request: AuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify wallet signature and return JWT tokens.
    """
    wallet_address = request.wallet_address.lower()
    
    # Get user
    result = await db.execute(
        select(User).where(User.wallet_address == wallet_address)
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.nonce:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid wallet or nonce not found. Request a new nonce.",
        )
    
    # Verify signature
    message = f"Sign this message to authenticate with TERRA.\n\nNonce: {user.nonce}"
    if not verify_signature(message, request.signature, wallet_address):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        )
    
    # Clear nonce (single use)
    user.nonce = None
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    # Generate tokens
    access_token = create_access_token(
        data={
            "sub": wallet_address,
            "role": user.role.value,
            "kyc_status": user.kyc_status.value,
        }
    )
    refresh_token = create_refresh_token(data={"sub": wallet_address})
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse(
            wallet_address=user.wallet_address,
            role=user.role.value,
            kyc_status=user.kyc_status.value,
            is_kyc_complete=user.is_kyc_complete,
            created_at=user.created_at,
        ),
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    request: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token using refresh token.
    """
    payload = verify_token(request.refresh_token, is_refresh=True)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    wallet_address = payload.get("sub")
    
    # Get user to include current role/KYC status
    result = await db.execute(
        select(User).where(User.wallet_address == wallet_address)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    # Generate new access token with current role/status
    access_token = create_access_token(
        data={
            "sub": wallet_address,
            "role": user.role.value,
            "kyc_status": user.kyc_status.value,
        }
    )
    
    return TokenRefreshResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user information.
    """
    return UserResponse(
        wallet_address=current_user.wallet_address,
        role=current_user.role.value,
        kyc_status=current_user.kyc_status.value,
        is_kyc_complete=current_user.is_kyc_complete,
        created_at=current_user.created_at,
        email=current_user.email,
        display_name=current_user.display_name,
    )


@router.put("/role", response_model=UserResponse)
async def update_user_role(
    request: RoleUpdateRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's role (Admin only).
    Role is stored server-side - this is NOT mocked.
    """
    target_address = request.wallet_address.lower()
    
    result = await db.execute(
        select(User).where(User.wallet_address == target_address)
    )
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Prevent admin from demoting themselves
    if target_user.id == current_user.id and request.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own admin role",
        )
    
    target_user.role = UserRole(request.role)
    await db.commit()
    await db.refresh(target_user)
    
    return UserResponse(
        wallet_address=target_user.wallet_address,
        role=target_user.role.value,
        kyc_status=target_user.kyc_status.value,
        is_kyc_complete=target_user.is_kyc_complete,
        created_at=target_user.created_at,
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
):
    """
    Logout user.
    In a stateless JWT system, client should discard tokens.
    For added security, we could maintain a token blacklist.
    """
    return {"message": "Successfully logged out"}

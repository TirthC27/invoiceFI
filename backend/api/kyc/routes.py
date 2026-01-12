"""
KYC API routes.

Handles KYC document upload, verification, and status management.

MOCK ALLOWED:
- OCR output (document text extraction)
- Verification response (face matching)

NOT MOCKED:
- Role gating (real authorization)
- KYC completion enforcement (real status check)
- Data storage (real database)
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.auth.utils import get_current_user, require_role
from api.kyc.schemas import (
    KYCStatusResponse,
    KYCProfileResponse,
    KYCSubmitRequest,
    KYCReviewRequest,
    KYCExtractedData,
)
from db.database import get_db
from db.models.user import User, UserRole, KYCStatus
from db.models.kyc_profile import KYCProfile
from db.models.kyc_audit_log import KYCAuditLog, KYCAuditAction
from services.kyc.document_processor import DocumentProcessor
from services.kyc.verification_service import VerificationService
from services.storage.pinata.uploader import PinataUploader

router = APIRouter()

# Services
doc_processor = DocumentProcessor()
verification_service = VerificationService()
pinata_uploader = PinataUploader()


@router.get("/status", response_model=KYCStatusResponse)
async def get_kyc_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's KYC status.
    
    Returns the real KYC status from database - NOT mocked.
    """
    # Get KYC profile if exists
    result = await db.execute(
        select(KYCProfile).where(KYCProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    return KYCStatusResponse(
        status=current_user.kyc_status.value,
        is_complete=current_user.is_kyc_complete,
        has_document=profile.document_cid is not None if profile else False,
        has_selfie=profile.selfie_cid is not None if profile else False,
        verification_score=profile.overall_score if profile else None,
        submitted_at=profile.submitted_at if profile else None,
        reviewed_at=profile.reviewed_at if profile else None,
    )


@router.post("/upload/document")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload identity document for KYC.
    
    Document is uploaded to IPFS via Pinata.
    OCR extraction may be mocked in Phase 2.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {allowed_types}",
        )
    
    # Get or create KYC profile
    result = await db.execute(
        select(KYCProfile).where(KYCProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = KYCProfile(
            user_id=current_user.id,
            wallet_address=current_user.wallet_address,
        )
        db.add(profile)
    
    # Upload to IPFS
    file_content = await file.read()
    upload_result = await pinata_uploader.upload_file(
        file_content,
        filename=f"kyc_doc_{current_user.wallet_address}_{datetime.utcnow().timestamp()}",
        metadata={"type": "kyc_document", "user": current_user.wallet_address},
    )
    
    profile.document_cid = upload_result["cid"]
    
    # Process document (OCR) - may be mocked
    extracted_data = await doc_processor.process_document(
        file_content,
        file.content_type,
    )
    
    # Update profile with extracted data
    profile.full_name = extracted_data.full_name
    profile.date_of_birth = extracted_data.date_of_birth
    profile.document_number = extracted_data.document_number
    profile.document_type = extracted_data.document_type
    profile.nationality = extracted_data.nationality
    profile.expiration_date = extracted_data.expiration_date
    profile.extracted_data = extracted_data.model_dump()
    profile.ocr_confidence = extracted_data.confidence
    
    # Update user status
    if current_user.kyc_status == KYCStatus.NOT_STARTED:
        current_user.kyc_status = KYCStatus.IN_PROGRESS
    
    # Audit log
    audit_log = KYCAuditLog(
        user_id=current_user.id,
        wallet_address=current_user.wallet_address,
        action=KYCAuditAction.DOCUMENT_UPLOADED,
        actor_address=current_user.wallet_address,
        actor_type="user",
        details={
            "document_cid": profile.document_cid,
            "ocr_confidence": extracted_data.confidence,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "success": True,
        "document_cid": profile.document_cid,
        "extracted_data": extracted_data.model_dump(),
    }


@router.post("/upload/selfie")
async def upload_selfie(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload selfie for KYC face matching.
    
    Selfie is uploaded to IPFS via Pinata.
    Face matching may be mocked in Phase 2.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {allowed_types}",
        )
    
    # Get KYC profile
    result = await db.execute(
        select(KYCProfile).where(KYCProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile or not profile.document_cid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload identity document first",
        )
    
    # Upload to IPFS
    file_content = await file.read()
    upload_result = await pinata_uploader.upload_file(
        file_content,
        filename=f"kyc_selfie_{current_user.wallet_address}_{datetime.utcnow().timestamp()}",
        metadata={"type": "kyc_selfie", "user": current_user.wallet_address},
    )
    
    profile.selfie_cid = upload_result["cid"]
    
    # Process face matching - may be mocked
    face_match_result = await verification_service.match_faces(
        document_cid=profile.document_cid,
        selfie_content=file_content,
    )
    
    profile.face_match_score = face_match_result.match_score
    
    # Calculate overall score
    profile.overall_score = (
        (profile.ocr_confidence or 0) * 0.3 +
        (profile.face_match_score or 0) * 0.7
    )
    
    # Audit log
    audit_log = KYCAuditLog(
        user_id=current_user.id,
        wallet_address=current_user.wallet_address,
        action=KYCAuditAction.SELFIE_UPLOADED,
        actor_address=current_user.wallet_address,
        actor_type="user",
        details={
            "selfie_cid": profile.selfie_cid,
            "face_match_score": face_match_result.match_score,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "success": True,
        "selfie_cid": profile.selfie_cid,
        "face_match_score": face_match_result.match_score,
        "overall_score": profile.overall_score,
    }


@router.post("/submit")
async def submit_kyc(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit KYC for review.
    
    This updates the REAL KYC status in the database.
    KYC completion is ENFORCED for protected operations.
    """
    # Get KYC profile
    result = await db.execute(
        select(KYCProfile).where(KYCProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No KYC profile found. Please upload documents first.",
        )
    
    if not profile.is_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC profile incomplete. Please upload document and selfie.",
        )
    
    # Check if already submitted
    if current_user.kyc_status in [KYCStatus.PENDING_REVIEW, KYCStatus.APPROVED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"KYC already {current_user.kyc_status.value}",
        )
    
    # Auto-approve if verification score is high enough
    if profile.verification_passed:
        current_user.kyc_status = KYCStatus.APPROVED
        current_user.kyc_completed_at = datetime.utcnow()
        profile.reviewed_at = datetime.utcnow()
        
        audit_action = KYCAuditAction.APPROVED
        audit_details = {"auto_approved": True, "score": profile.overall_score}
    else:
        current_user.kyc_status = KYCStatus.PENDING_REVIEW
        profile.submitted_at = datetime.utcnow()
        
        audit_action = KYCAuditAction.SUBMITTED_FOR_REVIEW
        audit_details = {"score": profile.overall_score}
    
    # Audit log
    audit_log = KYCAuditLog(
        user_id=current_user.id,
        wallet_address=current_user.wallet_address,
        action=audit_action,
        actor_address=current_user.wallet_address,
        actor_type="user" if audit_action == KYCAuditAction.SUBMITTED_FOR_REVIEW else "system",
        details=audit_details,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "success": True,
        "status": current_user.kyc_status.value,
        "is_approved": current_user.kyc_status == KYCStatus.APPROVED,
    }


@router.get("/profile", response_model=KYCProfileResponse)
async def get_kyc_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's KYC profile.
    """
    result = await db.execute(
        select(KYCProfile).where(KYCProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC profile not found",
        )
    
    return KYCProfileResponse(
        wallet_address=profile.wallet_address,
        document_cid=profile.document_cid,
        selfie_cid=profile.selfie_cid,
        full_name=profile.full_name,
        document_type=profile.document_type,
        ocr_confidence=profile.ocr_confidence,
        face_match_score=profile.face_match_score,
        overall_score=profile.overall_score,
        status=current_user.kyc_status.value,
        submitted_at=profile.submitted_at,
        reviewed_at=profile.reviewed_at,
    )


# Admin endpoints for KYC review

@router.get("/pending", dependencies=[Depends(require_role(UserRole.ADMIN))])
async def get_pending_kyc(
    db: AsyncSession = Depends(get_db),
):
    """
    Get all pending KYC submissions (Admin only).
    """
    result = await db.execute(
        select(User, KYCProfile)
        .join(KYCProfile, User.id == KYCProfile.user_id)
        .where(User.kyc_status == KYCStatus.PENDING_REVIEW)
    )
    pending = result.all()
    
    return {
        "pending_count": len(pending),
        "submissions": [
            {
                "wallet_address": user.wallet_address,
                "full_name": profile.full_name,
                "document_type": profile.document_type,
                "overall_score": profile.overall_score,
                "submitted_at": profile.submitted_at,
            }
            for user, profile in pending
        ],
    }


@router.post("/review/{wallet_address}", dependencies=[Depends(require_role(UserRole.ADMIN))])
async def review_kyc(
    wallet_address: str,
    review: KYCReviewRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Review and approve/reject KYC submission (Admin only).
    
    This updates the REAL KYC status.
    """
    # Get target user
    result = await db.execute(
        select(User).where(User.wallet_address == wallet_address.lower())
    )
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if target_user.kyc_status != KYCStatus.PENDING_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"KYC is not pending review. Current status: {target_user.kyc_status.value}",
        )
    
    # Get profile
    result = await db.execute(
        select(KYCProfile).where(KYCProfile.user_id == target_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC profile not found",
        )
    
    # Update status based on review
    if review.approved:
        target_user.kyc_status = KYCStatus.APPROVED
        target_user.kyc_completed_at = datetime.utcnow()
        audit_action = KYCAuditAction.APPROVED
    else:
        target_user.kyc_status = KYCStatus.REJECTED
        profile.rejection_reason = review.reason
        audit_action = KYCAuditAction.REJECTED
    
    profile.reviewed_by = current_user.wallet_address
    profile.reviewed_at = datetime.utcnow()
    profile.review_notes = review.notes
    
    # Audit log
    audit_log = KYCAuditLog(
        user_id=target_user.id,
        wallet_address=target_user.wallet_address,
        action=audit_action,
        actor_address=current_user.wallet_address,
        actor_type="admin",
        details={
            "approved": review.approved,
            "reason": review.reason,
            "notes": review.notes,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "success": True,
        "wallet_address": target_user.wallet_address,
        "new_status": target_user.kyc_status.value,
    }

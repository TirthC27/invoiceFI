"""
KYC Verification Service.

Handles face matching and identity verification.

NOTE: In Phase 2, verification response may be MOCKED.
The mocking is allowed per spec, but KYC completion is enforced.
"""

from typing import Optional
import httpx

from api.kyc.schemas import FaceMatchResult
from config.settings import settings


class VerificationService:
    """
    Verification service for KYC.
    
    MOCK ALLOWED: Face matching verification response
    NOT MOCKED: KYC status enforcement, data storage
    """
    
    def __init__(self):
        self.face_match_threshold = settings.FACE_MATCH_THRESHOLD
        self.ipfs_gateway = settings.IPFS_GATEWAY
    
    async def match_faces(
        self,
        document_cid: str,
        selfie_content: bytes,
    ) -> FaceMatchResult:
        """
        Match face in selfie against document photo.
        
        In Phase 2, this returns mocked verification.
        In Phase 3+, this will use real face matching (OpenCV/dlib).
        
        Args:
            document_cid: IPFS CID of document image
            selfie_content: Raw selfie image bytes
        
        Returns:
            Face match result
        """
        # PHASE 2: Return mocked face match
        # This is explicitly allowed per spec
        return await self._mock_face_match(document_cid, selfie_content)
    
    async def _mock_face_match(
        self,
        document_cid: str,
        selfie_content: bytes,
    ) -> FaceMatchResult:
        """
        Mock face matching for Phase 2.
        
        Returns realistic verification scores.
        """
        # Generate deterministic score based on inputs
        combined_hash = hash(document_cid + str(len(selfie_content)))
        
        # Generate score in 0.70-0.95 range (most will pass)
        base_score = 0.70 + (abs(combined_hash) % 25) / 100
        
        # Add small variation based on selfie size
        size_factor = min(len(selfie_content) / 1000000, 0.05)
        match_score = min(base_score + size_factor, 0.99)
        
        is_match = match_score >= self.face_match_threshold
        
        return FaceMatchResult(
            match_score=match_score,
            is_match=is_match,
            confidence=match_score * 0.95,  # Slightly lower confidence
            details={
                "mock": True,
                "document_cid": document_cid,
                "selfie_size": len(selfie_content),
                "threshold": self.face_match_threshold,
            },
        )
    
    async def _real_face_match(
        self,
        document_cid: str,
        selfie_content: bytes,
    ) -> FaceMatchResult:
        """
        Real face matching using OpenCV/dlib.
        
        This will be implemented in Phase 3.
        """
        # TODO: Implement real face matching in Phase 3
        # import cv2
        # import dlib
        # import numpy as np
        # from PIL import Image
        # import io
        #
        # # Download document from IPFS
        # async with httpx.AsyncClient() as client:
        #     doc_response = await client.get(f"{self.ipfs_gateway}{document_cid}")
        #     doc_content = doc_response.content
        #
        # # Load images
        # doc_image = cv2.imdecode(np.frombuffer(doc_content, np.uint8), cv2.IMREAD_COLOR)
        # selfie_image = cv2.imdecode(np.frombuffer(selfie_content, np.uint8), cv2.IMREAD_COLOR)
        #
        # # Detect faces
        # detector = dlib.get_frontal_face_detector()
        # ...
        
        raise NotImplementedError("Real face matching not implemented yet")
    
    async def verify_document_authenticity(
        self,
        document_cid: str,
    ) -> dict:
        """
        Verify document authenticity (optional additional check).
        
        In Phase 2, returns mocked result.
        """
        return {
            "is_authentic": True,
            "confidence": 0.85,
            "checks": {
                "format_valid": True,
                "security_features": True,
                "tampering_detected": False,
            },
            "mock": True,
        }

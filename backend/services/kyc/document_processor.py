"""
KYC Document Processor Service.

Handles document OCR and data extraction.

NOTE: In Phase 2, OCR output may be MOCKED for development.
The mocking is allowed per spec, but the KYC status itself is real.
"""

import re
from typing import Optional
from datetime import datetime

from api.kyc.schemas import KYCExtractedData
from config.settings import settings


class DocumentProcessor:
    """
    Document processor for KYC.
    
    MOCK ALLOWED: OCR output extraction
    NOT MOCKED: Data storage, status updates
    """
    
    def __init__(self):
        self.confidence_threshold = settings.OCR_CONFIDENCE_THRESHOLD
    
    async def process_document(
        self,
        file_content: bytes,
        content_type: str,
    ) -> KYCExtractedData:
        """
        Process document and extract data.
        
        In Phase 2, this returns mocked OCR data.
        In Phase 3+, this will use real OCR (pytesseract).
        
        Args:
            file_content: Raw file bytes
            content_type: MIME type
        
        Returns:
            Extracted KYC data
        """
        # PHASE 2: Return mocked OCR data
        # This is explicitly allowed per spec
        return await self._mock_ocr_extraction(file_content)
    
    async def _mock_ocr_extraction(self, file_content: bytes) -> KYCExtractedData:
        """
        Mock OCR extraction for Phase 2.
        
        Returns realistic-looking extracted data.
        """
        # Generate deterministic but varied mock data based on file hash
        file_hash = hash(file_content[:1000]) if len(file_content) > 1000 else hash(file_content)
        
        # Mock names based on hash for variety
        mock_names = [
            "John Smith",
            "Jane Doe",
            "Michael Johnson",
            "Sarah Williams",
            "David Brown",
        ]
        
        mock_nationalities = ["United States", "United Kingdom", "Canada", "Australia", "Germany"]
        mock_doc_types = ["passport", "drivers_license", "national_id"]
        
        name_idx = abs(file_hash) % len(mock_names)
        nat_idx = abs(file_hash) % len(mock_nationalities)
        doc_idx = abs(file_hash) % len(mock_doc_types)
        
        # Generate mock document number
        doc_number = f"DOC{abs(file_hash) % 1000000:06d}"
        
        # Generate mock dates
        birth_year = 1970 + (abs(file_hash) % 35)
        birth_month = (abs(file_hash) % 12) + 1
        birth_day = (abs(file_hash) % 28) + 1
        
        exp_year = datetime.now().year + 5 + (abs(file_hash) % 5)
        exp_month = (abs(file_hash) % 12) + 1
        exp_day = (abs(file_hash) % 28) + 1
        
        # Generate confidence score (0.75-0.95 range)
        confidence = 0.75 + (abs(file_hash) % 20) / 100
        
        return KYCExtractedData(
            full_name=mock_names[name_idx],
            date_of_birth=f"{birth_year}-{birth_month:02d}-{birth_day:02d}",
            document_number=doc_number,
            document_type=mock_doc_types[doc_idx],
            nationality=mock_nationalities[nat_idx],
            expiration_date=f"{exp_year}-{exp_month:02d}-{exp_day:02d}",
            confidence=confidence,
            raw_text=f"[MOCK OCR] Document processed successfully",
        )
    
    async def _real_ocr_extraction(self, file_content: bytes, content_type: str) -> KYCExtractedData:
        """
        Real OCR extraction using pytesseract.
        
        This will be implemented in Phase 3.
        """
        # TODO: Implement real OCR in Phase 3
        # import pytesseract
        # import cv2
        # import numpy as np
        # from PIL import Image
        # import io
        #
        # # Convert bytes to image
        # image = Image.open(io.BytesIO(file_content))
        # 
        # # Perform OCR
        # text = pytesseract.image_to_string(image)
        # 
        # # Parse extracted text for structured data
        # ...
        
        raise NotImplementedError("Real OCR not implemented yet")

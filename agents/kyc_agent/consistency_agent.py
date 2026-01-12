"""
KYC Consistency Agent - REAL AI AGENT (NO MOCK)

This agent performs real consistency checks between:
- KYC profile data
- Asset documents

Uses:
- Real OCR libraries (pytesseract)
- Fuzzy string matching
- Name comparison algorithms

Input: KYC profile + asset docs
Output: Name match score, ID match score
"""

import re
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

from agents.agent_common.ocr_utils import OCRProcessor
from agents.agent_common.name_utils import NameMatcher


@dataclass
class ConsistencyResult:
    """Result of KYC consistency check."""
    is_consistent: bool
    name_match_score: float
    id_match_score: float
    overall_confidence: float
    details: Dict[str, Any]
    warnings: list
    errors: list


class KYCConsistencyAgent:
    """
    KYC Consistency Agent.
    
    Performs REAL consistency verification between KYC data and asset documents.
    NO MOCKING - uses actual OCR and fuzzy matching.
    """
    
    def __init__(self):
        self.ocr_processor = OCRProcessor()
        self.name_matcher = NameMatcher()
        self.min_name_match_threshold = 80  # 80% match required
        self.min_id_match_threshold = 70
    
    async def check_consistency(
        self,
        kyc_profile: Dict[str, Any],
        asset_document_content: bytes,
        asset_document_type: str = "image",
    ) -> ConsistencyResult:
        """
        Check consistency between KYC profile and asset document.
        
        Args:
            kyc_profile: KYC profile data with extracted fields
            asset_document_content: Raw bytes of asset document
            asset_document_type: Type of document (image/pdf)
        
        Returns:
            ConsistencyResult with match scores
        """
        warnings = []
        errors = []
        details = {}
        
        # Extract text from asset document using real OCR
        try:
            extracted_text = await self.ocr_processor.extract_text(
                asset_document_content,
                document_type=asset_document_type,
            )
            details["extracted_text_length"] = len(extracted_text)
        except Exception as e:
            errors.append(f"OCR extraction failed: {str(e)}")
            return ConsistencyResult(
                is_consistent=False,
                name_match_score=0.0,
                id_match_score=0.0,
                overall_confidence=0.0,
                details=details,
                warnings=warnings,
                errors=errors,
            )
        
        # Extract entities from asset document
        extracted_entities = self._extract_entities(extracted_text)
        details["extracted_entities"] = extracted_entities
        
        # Compare names
        kyc_name = kyc_profile.get("full_name", "")
        name_match_score = self._compare_names(
            kyc_name,
            extracted_entities.get("names", []),
        )
        details["kyc_name"] = kyc_name
        details["found_names"] = extracted_entities.get("names", [])
        
        # Compare ID/document numbers
        kyc_doc_number = kyc_profile.get("document_number", "")
        id_match_score = self._compare_ids(
            kyc_doc_number,
            extracted_entities.get("ids", []),
        )
        details["kyc_doc_number"] = kyc_doc_number
        details["found_ids"] = extracted_entities.get("ids", [])
        
        # Calculate overall confidence
        overall_confidence = (name_match_score * 0.6 + id_match_score * 0.4)
        
        # Determine consistency
        is_consistent = (
            name_match_score >= self.min_name_match_threshold and
            id_match_score >= self.min_id_match_threshold
        )
        
        # Add warnings for borderline cases
        if 60 <= name_match_score < self.min_name_match_threshold:
            warnings.append(f"Name match score ({name_match_score}%) is borderline")
        
        if 50 <= id_match_score < self.min_id_match_threshold:
            warnings.append(f"ID match score ({id_match_score}%) is borderline")
        
        return ConsistencyResult(
            is_consistent=is_consistent,
            name_match_score=name_match_score,
            id_match_score=id_match_score,
            overall_confidence=overall_confidence,
            details=details,
            warnings=warnings,
            errors=errors,
        )
    
    def _extract_entities(self, text: str) -> Dict[str, list]:
        """
        Extract named entities from text.
        
        Args:
            text: Extracted document text
        
        Returns:
            Dictionary with extracted names, IDs, dates, etc.
        """
        entities = {
            "names": [],
            "ids": [],
            "dates": [],
            "addresses": [],
        }
        
        # Name patterns (capitalized words sequences)
        name_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b'
        names = re.findall(name_pattern, text)
        entities["names"] = list(set(names))[:10]  # Limit to 10 unique names
        
        # ID patterns (alphanumeric sequences that look like IDs)
        id_patterns = [
            r'\b([A-Z]{1,3}\d{6,12})\b',  # Like AB123456
            r'\b(\d{9,12})\b',  # Pure numbers
            r'\b([A-Z0-9]{8,15})\b',  # Mixed alphanumeric
        ]
        for pattern in id_patterns:
            ids = re.findall(pattern, text)
            entities["ids"].extend(ids)
        entities["ids"] = list(set(entities["ids"]))[:10]
        
        # Date patterns
        date_patterns = [
            r'\b(\d{1,2}/\d{1,2}/\d{2,4})\b',
            r'\b(\d{1,2}-\d{1,2}-\d{2,4})\b',
            r'\b(\d{4}-\d{2}-\d{2})\b',
        ]
        for pattern in date_patterns:
            dates = re.findall(pattern, text)
            entities["dates"].extend(dates)
        entities["dates"] = list(set(entities["dates"]))[:10]
        
        return entities
    
    def _compare_names(self, kyc_name: str, document_names: list) -> float:
        """
        Compare KYC name against names found in document.
        
        Uses fuzzy matching for name comparison.
        
        Args:
            kyc_name: Name from KYC profile
            document_names: Names extracted from document
        
        Returns:
            Best match score (0-100)
        """
        if not kyc_name or not document_names:
            return 0.0
        
        # Normalize names
        kyc_name_normalized = self.name_matcher.normalize_name(kyc_name)
        
        best_score = 0.0
        for doc_name in document_names:
            doc_name_normalized = self.name_matcher.normalize_name(doc_name)
            
            # Try multiple matching strategies
            scores = [
                fuzz.ratio(kyc_name_normalized, doc_name_normalized),
                fuzz.partial_ratio(kyc_name_normalized, doc_name_normalized),
                fuzz.token_sort_ratio(kyc_name_normalized, doc_name_normalized),
                fuzz.token_set_ratio(kyc_name_normalized, doc_name_normalized),
            ]
            
            # Use the best score from all strategies
            score = max(scores)
            if score > best_score:
                best_score = score
        
        return best_score
    
    def _compare_ids(self, kyc_id: str, document_ids: list) -> float:
        """
        Compare KYC ID/document number against IDs found in document.
        
        Args:
            kyc_id: ID from KYC profile
            document_ids: IDs extracted from document
        
        Returns:
            Best match score (0-100)
        """
        if not kyc_id or not document_ids:
            return 0.0
        
        # Normalize IDs (remove spaces, uppercase)
        kyc_id_normalized = re.sub(r'\s+', '', kyc_id.upper())
        
        best_score = 0.0
        for doc_id in document_ids:
            doc_id_normalized = re.sub(r'\s+', '', doc_id.upper())
            
            # Exact match
            if kyc_id_normalized == doc_id_normalized:
                return 100.0
            
            # Fuzzy match
            score = fuzz.ratio(kyc_id_normalized, doc_id_normalized)
            if score > best_score:
                best_score = score
        
        return best_score
    
    async def run(
        self,
        kyc_profile: Dict[str, Any],
        asset_document_content: bytes,
        asset_document_type: str = "image",
    ) -> Dict[str, Any]:
        """
        Main entry point for the agent.
        
        Args:
            kyc_profile: KYC profile data
            asset_document_content: Raw asset document bytes
            asset_document_type: Document type
        
        Returns:
            Consistency check results as dictionary
        """
        result = await self.check_consistency(
            kyc_profile=kyc_profile,
            asset_document_content=asset_document_content,
            asset_document_type=asset_document_type,
        )
        
        return {
            "is_consistent": result.is_consistent,
            "name_match_score": result.name_match_score,
            "id_match_score": result.id_match_score,
            "overall_confidence": result.overall_confidence,
            "details": result.details,
            "warnings": result.warnings,
            "errors": result.errors,
        }

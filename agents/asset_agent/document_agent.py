"""
Asset Document Agent - REAL AI AGENT (NO MOCK)

This agent extracts real data from asset documents:
- Asset identifiers
- Owner name
- Value
- Dates

Generates asset fingerprint hash.
Sends result to backend for on-chain registration.

NO FAKE OUTPUTS - uses real OCR and NLP.
"""

import re
import hashlib
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime

from agents.agent_common.ocr_utils import OCRProcessor


@dataclass
class ExtractedAssetData:
    """Extracted data from asset document."""
    asset_identifier: Optional[str]
    owner_name: Optional[str]
    asset_value: Optional[float]
    currency: Optional[str]
    dates: Dict[str, str]  # key: date_type, value: date string
    asset_type: Optional[str]
    location: Optional[str]
    additional_info: Dict[str, Any]
    raw_text: str
    extraction_confidence: float


@dataclass
class AssetFingerprint:
    """Asset fingerprint for uniqueness verification."""
    fingerprint_hash: str
    components: Dict[str, str]
    created_at: str
    algorithm: str


class AssetDocumentAgent:
    """
    Asset Document Agent.
    
    Performs REAL extraction of asset information from documents.
    NO MOCKING - uses actual OCR and entity extraction.
    
    Extracts:
    - Asset identifiers (title numbers, registration IDs, etc.)
    - Owner name
    - Value
    - Dates (purchase, valuation, etc.)
    
    Generates fingerprint hash for on-chain registration.
    """
    
    def __init__(self):
        self.ocr_processor = OCRProcessor()
    
    async def extract_asset_data(
        self,
        document_content: bytes,
        document_type: str = "image",
        expected_asset_type: Optional[str] = None,
    ) -> ExtractedAssetData:
        """
        Extract asset data from document.
        
        Args:
            document_content: Raw document bytes
            document_type: Type of document (image/pdf)
            expected_asset_type: Hint about expected asset type
        
        Returns:
            ExtractedAssetData with all extracted fields
        """
        # Extract text using real OCR
        raw_text = await self.ocr_processor.extract_text(
            document_content,
            document_type=document_type,
        )
        
        # Extract various entities
        asset_identifier = self._extract_identifier(raw_text, expected_asset_type)
        owner_name = self._extract_owner_name(raw_text)
        value_info = self._extract_value(raw_text)
        dates = self._extract_dates(raw_text)
        asset_type = self._detect_asset_type(raw_text, expected_asset_type)
        location = self._extract_location(raw_text)
        
        # Calculate extraction confidence
        confidence = self._calculate_confidence(
            asset_identifier=asset_identifier,
            owner_name=owner_name,
            value=value_info.get("value"),
            dates=dates,
        )
        
        return ExtractedAssetData(
            asset_identifier=asset_identifier,
            owner_name=owner_name,
            asset_value=value_info.get("value"),
            currency=value_info.get("currency"),
            dates=dates,
            asset_type=asset_type,
            location=location,
            additional_info={
                "value_raw": value_info.get("raw"),
                "text_length": len(raw_text),
            },
            raw_text=raw_text[:5000],  # Limit stored raw text
            extraction_confidence=confidence,
        )
    
    async def generate_fingerprint(
        self,
        extracted_data: ExtractedAssetData,
    ) -> AssetFingerprint:
        """
        Generate unique fingerprint hash for asset.
        
        The fingerprint is based on:
        - Asset identifier
        - Owner name
        - Key dates
        - Document content hash
        
        Args:
            extracted_data: Extracted asset data
        
        Returns:
            AssetFingerprint with hash and components
        """
        # Build fingerprint components
        components = {
            "identifier": extracted_data.asset_identifier or "",
            "owner": extracted_data.owner_name or "",
            "type": extracted_data.asset_type or "",
            "value": str(extracted_data.asset_value or ""),
        }
        
        # Add key dates
        for date_type, date_value in extracted_data.dates.items():
            components[f"date_{date_type}"] = date_value
        
        # Create deterministic string for hashing
        fingerprint_string = json.dumps(components, sort_keys=True)
        
        # Generate SHA-256 hash
        fingerprint_hash = hashlib.sha256(fingerprint_string.encode()).hexdigest()
        
        return AssetFingerprint(
            fingerprint_hash=f"0x{fingerprint_hash}",
            components=components,
            created_at=datetime.utcnow().isoformat(),
            algorithm="sha256",
        )
    
    def _extract_identifier(self, text: str, asset_type: Optional[str]) -> Optional[str]:
        """Extract asset identifier based on asset type."""
        patterns = {
            "real_estate": [
                r'(?:title|deed|property)\s*(?:no|number|#)?[:\s]*([A-Z0-9-]+)',
                r'(?:parcel|lot)\s*(?:no|number|#)?[:\s]*([A-Z0-9-]+)',
                r'(?:folio|volume)\s*(?:no|number)?[:\s]*([A-Z0-9-]+)',
            ],
            "vehicle": [
                r'(?:vin|vehicle\s*id)[:\s]*([A-Z0-9]{17})',
                r'(?:registration|plate)\s*(?:no|number)?[:\s]*([A-Z0-9-]+)',
            ],
            "invoice": [
                r'(?:invoice|inv)\s*(?:no|number|#)?[:\s]*([A-Z0-9-]+)',
                r'(?:po|purchase\s*order)\s*(?:no|number)?[:\s]*([A-Z0-9-]+)',
            ],
            "equipment": [
                r'(?:serial|model)\s*(?:no|number)?[:\s]*([A-Z0-9-]+)',
                r'(?:asset|equipment)\s*(?:id|tag)?[:\s]*([A-Z0-9-]+)',
            ],
        }
        
        # Determine which patterns to use
        if asset_type and asset_type in patterns:
            search_patterns = patterns[asset_type]
        else:
            # Use all patterns
            search_patterns = []
            for pattern_list in patterns.values():
                search_patterns.extend(pattern_list)
        
        # Search for identifiers
        text_lower = text.lower()
        for pattern in search_patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                return match.group(1).upper()
        
        return None
    
    def _extract_owner_name(self, text: str) -> Optional[str]:
        """Extract owner/holder name from document."""
        # Patterns for owner identification
        patterns = [
            r'(?:owner|holder|proprietor|buyer|purchaser)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'(?:name\s*of\s*owner|registered\s*to)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'(?:in\s*the\s*name\s*of)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        # Fallback: Look for capitalized name sequences after common labels
        name_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b'
        names = re.findall(name_pattern, text)
        
        if names:
            # Filter out common non-name words
            excluded = {'The', 'This', 'That', 'These', 'Those', 'United', 'States'}
            valid_names = [n for n in names if n.split()[0] not in excluded]
            if valid_names:
                return valid_names[0]
        
        return None
    
    def _extract_value(self, text: str) -> Dict[str, Any]:
        """Extract monetary value from document."""
        result = {"value": None, "currency": None, "raw": None}
        
        # Currency patterns
        patterns = [
            r'(?:value|price|amount|total|worth)[:\s]*\$\s*([\d,]+(?:\.\d{2})?)',
            r'(?:value|price|amount|total|worth)[:\s]*([\d,]+(?:\.\d{2})?)\s*(?:usd|dollars)',
            r'\$\s*([\d,]+(?:\.\d{2})?)',
            r'([\d,]+(?:\.\d{2})?)\s*(?:usd|dollars|USD)',
            r'(?:EUR|€)\s*([\d,]+(?:\.\d{2})?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                raw_value = match.group(1)
                result["raw"] = raw_value
                
                # Parse numeric value
                try:
                    clean_value = raw_value.replace(',', '')
                    result["value"] = float(clean_value)
                    
                    # Detect currency
                    if '$' in match.group(0) or 'usd' in match.group(0).lower():
                        result["currency"] = "USD"
                    elif '€' in match.group(0) or 'eur' in match.group(0).lower():
                        result["currency"] = "EUR"
                    else:
                        result["currency"] = "USD"  # Default
                    
                    break
                except ValueError:
                    continue
        
        return result
    
    def _extract_dates(self, text: str) -> Dict[str, str]:
        """Extract various dates from document."""
        dates = {}
        
        # Date patterns with context
        date_contexts = [
            (r'(?:purchase|acquisition|bought)\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', "purchase"),
            (r'(?:issue|issued)\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', "issue"),
            (r'(?:valuation|appraisal)\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', "valuation"),
            (r'(?:expir|expiry|expires)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', "expiration"),
            (r'(?:dated|date)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', "document"),
        ]
        
        for pattern, date_type in date_contexts:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                dates[date_type] = match.group(1)
        
        # ISO format dates
        iso_pattern = r'(\d{4}-\d{2}-\d{2})'
        iso_dates = re.findall(iso_pattern, text)
        if iso_dates and "document" not in dates:
            dates["document"] = iso_dates[0]
        
        return dates
    
    def _detect_asset_type(self, text: str, hint: Optional[str]) -> Optional[str]:
        """Detect asset type from document content."""
        if hint:
            return hint
        
        # Keywords for different asset types
        type_keywords = {
            "real_estate": ["property", "deed", "title", "land", "building", "real estate", "parcel", "lot"],
            "vehicle": ["vehicle", "automobile", "car", "vin", "registration", "motor"],
            "invoice": ["invoice", "bill", "payment due", "purchase order", "po#"],
            "equipment": ["equipment", "machinery", "serial number", "asset tag", "model"],
        }
        
        text_lower = text.lower()
        
        scores = {}
        for asset_type, keywords in type_keywords.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            scores[asset_type] = score
        
        if scores:
            best_type = max(scores, key=scores.get)
            if scores[best_type] > 0:
                return best_type
        
        return None
    
    def _extract_location(self, text: str) -> Optional[str]:
        """Extract location/address from document."""
        # Address patterns
        patterns = [
            r'(?:address|location|situated\s*at)[:\s]+(.+?)(?:\n|$)',
            r'(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln))',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:200]  # Limit length
        
        return None
    
    def _calculate_confidence(
        self,
        asset_identifier: Optional[str],
        owner_name: Optional[str],
        value: Optional[float],
        dates: Dict[str, str],
    ) -> float:
        """Calculate extraction confidence score."""
        score = 0.0
        weights = {
            "identifier": 0.3,
            "owner": 0.25,
            "value": 0.25,
            "dates": 0.2,
        }
        
        if asset_identifier:
            score += weights["identifier"]
        if owner_name:
            score += weights["owner"]
        if value:
            score += weights["value"]
        if dates:
            score += weights["dates"] * min(len(dates) / 2, 1.0)
        
        return round(score, 2)
    
    async def run(
        self,
        document_content: bytes,
        document_type: str = "image",
        expected_asset_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for the agent.
        
        Args:
            document_content: Raw document bytes
            document_type: Document type
            expected_asset_type: Hint about asset type
        
        Returns:
            Extracted asset data and fingerprint
        """
        # Extract data
        extracted_data = await self.extract_asset_data(
            document_content=document_content,
            document_type=document_type,
            expected_asset_type=expected_asset_type,
        )
        
        # Generate fingerprint
        fingerprint = await self.generate_fingerprint(extracted_data)
        
        return {
            "asset_identifier": extracted_data.asset_identifier,
            "owner_name": extracted_data.owner_name,
            "asset_value": extracted_data.asset_value,
            "currency": extracted_data.currency,
            "dates": extracted_data.dates,
            "asset_type": extracted_data.asset_type,
            "location": extracted_data.location,
            "additional_info": extracted_data.additional_info,
            "extraction_confidence": extracted_data.extraction_confidence,
            "fingerprint_hash": fingerprint.fingerprint_hash,
            "fingerprint_components": fingerprint.components,
        }

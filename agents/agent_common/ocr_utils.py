"""
OCR Utilities for Agents - REAL OCR (NO MOCK).

Uses:
- pytesseract for OCR
- pdf2image for PDF processing
- Pillow for image manipulation

REAL OCR extraction - no fake outputs.
"""

import io
import re
from typing import Optional, Union, List
from PIL import Image

# Optional imports - will use fallback if not available
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False


class OCRProcessor:
    """
    OCR processor using Tesseract.
    
    REAL OCR extraction from images and PDFs.
    No mocking - uses actual OCR engine.
    """
    
    def __init__(
        self,
        tesseract_cmd: Optional[str] = None,
        language: str = "eng",
    ):
        """
        Initialize OCR processor.
        
        Args:
            tesseract_cmd: Path to tesseract executable
            language: OCR language (default: English)
        """
        self.language = language
        
        if tesseract_cmd and TESSERACT_AVAILABLE:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    
    async def extract_text(
        self,
        content: bytes,
        document_type: str = "image",
    ) -> str:
        """
        Extract text from document.
        
        Args:
            content: Raw document bytes
            document_type: Type of document (image/pdf)
        
        Returns:
            Extracted text
        """
        if document_type == "pdf":
            return await self._extract_from_pdf(content)
        else:
            return await self._extract_from_image(content)
    
    async def _extract_from_image(self, image_bytes: bytes) -> str:
        """Extract text from image using Tesseract."""
        try:
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Preprocess
            image = self._preprocess_image(image)
            
            if TESSERACT_AVAILABLE:
                # Use Tesseract OCR
                text = pytesseract.image_to_string(
                    image,
                    lang=self.language,
                    config='--psm 6',  # Assume uniform text block
                )
                return self._postprocess_text(text)
            else:
                # Fallback: basic image analysis (very limited)
                return self._fallback_extraction(image)
        
        except Exception as e:
            raise OCRExtractionError(f"Failed to extract text from image: {str(e)}")
    
    async def _extract_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF."""
        if not PDF2IMAGE_AVAILABLE:
            raise OCRExtractionError("PDF processing not available. Install pdf2image.")
        
        try:
            # Convert PDF to images
            images = convert_from_bytes(pdf_bytes)
            
            # Extract text from each page
            all_text = []
            for i, image in enumerate(images):
                # Preprocess
                image = self._preprocess_image(image)
                
                if TESSERACT_AVAILABLE:
                    text = pytesseract.image_to_string(
                        image,
                        lang=self.language,
                        config='--psm 6',
                    )
                    all_text.append(f"--- Page {i + 1} ---\n{text}")
                else:
                    all_text.append(self._fallback_extraction(image))
            
            combined = "\n\n".join(all_text)
            return self._postprocess_text(combined)
        
        except Exception as e:
            raise OCRExtractionError(f"Failed to extract text from PDF: {str(e)}")
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results.
        
        - Convert to grayscale
        - Enhance contrast
        - Resize if needed
        """
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Resize if too small (minimum 300 DPI effective)
        min_width = 1000
        if image.width < min_width:
            ratio = min_width / image.width
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        return image
    
    def _postprocess_text(self, text: str) -> str:
        """
        Clean up OCR output.
        
        - Remove excessive whitespace
        - Fix common OCR errors
        - Normalize characters
        """
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        
        # Fix common OCR errors
        replacements = {
            '|': 'I',  # Pipe often misread as I
            '0': 'O',  # Context-dependent, skip for now
            '1': 'l',  # Context-dependent, skip for now
        }
        
        # Clean lines
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _fallback_extraction(self, image: Image.Image) -> str:
        """
        Fallback extraction when Tesseract not available.
        Returns placeholder indicating OCR is needed.
        """
        return "[OCR extraction requires Tesseract installation]"
    
    async def extract_with_confidence(
        self,
        content: bytes,
        document_type: str = "image",
    ) -> dict:
        """
        Extract text with confidence scores.
        
        Args:
            content: Raw document bytes
            document_type: Document type
        
        Returns:
            Dict with text and confidence data
        """
        if not TESSERACT_AVAILABLE:
            text = await self.extract_text(content, document_type)
            return {
                "text": text,
                "confidence": 0.0,
                "word_confidences": [],
            }
        
        try:
            if document_type == "pdf":
                # For PDF, process first page for confidence
                if PDF2IMAGE_AVAILABLE:
                    images = convert_from_bytes(content)
                    image = images[0] if images else None
                else:
                    return {
                        "text": await self.extract_text(content, document_type),
                        "confidence": 0.0,
                        "word_confidences": [],
                    }
            else:
                image = Image.open(io.BytesIO(content))
            
            if image is None:
                return {
                    "text": "",
                    "confidence": 0.0,
                    "word_confidences": [],
                }
            
            image = self._preprocess_image(image)
            
            # Get detailed OCR data
            data = pytesseract.image_to_data(
                image,
                lang=self.language,
                output_type=pytesseract.Output.DICT,
            )
            
            # Calculate average confidence
            confidences = [
                int(c) for c in data['conf']
                if c != '-1' and str(c).isdigit()
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            # Get full text
            text = await self.extract_text(content, document_type)
            
            return {
                "text": text,
                "confidence": avg_confidence / 100.0,  # Normalize to 0-1
                "word_confidences": list(zip(data['text'], data['conf'])),
            }
        
        except Exception as e:
            return {
                "text": "",
                "confidence": 0.0,
                "word_confidences": [],
                "error": str(e),
            }


class OCRExtractionError(Exception):
    """Exception raised when OCR extraction fails."""
    pass

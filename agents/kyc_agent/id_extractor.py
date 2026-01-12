"""
Identity document extractor.

OCR and text extraction from identity documents:
- Reads ID document from IPFS via CID (temporary access URL)
- Document type detection
- Field extraction (name, DOB, ID number, etc.)
- OCR preprocessing
- Text validation

Note: Documents are fetched from IPFS, processed in-memory, then discarded.
No local persistence of document images.
"""


"""
KYC agent orchestrator.

Coordinates the KYC extraction flow:
- Entry point accepts CID + temporary access URL (not raw files)
- Document processing pipeline (fetches from IPFS via CID)
- Selfie verification coordination (fetches from IPFS via CID)
- Confidence evaluation
- Result aggregation

Note: Agents never store documents locally.
All files are processed in-memory only and fetched from IPFS.
"""


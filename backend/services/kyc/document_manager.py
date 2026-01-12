"""
KYC document manager.

Orchestrates document upload and agent handoff:
- Receives uploaded documents
- Uploads to Pinata/IPFS
- Stores CID references in database
- Generates temporary access URLs for agents
- Coordinates agent task dispatch with CIDs
"""


# KYC Storage Model

## Overview
Document storage architecture using Pinata/IPFS for KYC documents.

## Storage Flow

### What Goes to IPFS (via Pinata)
- Raw identity document images (front/back)
- Raw selfie images
- Uploaded via Pinata API
- Returns CID (Content Identifier)
- Documents are immutable on IPFS

### What Goes to Blockchain
- Placeholder: No raw documents stored on-chain
- Only references/pointers if needed

### What Stays in Backend Database
- CID references (not raw files)
- KYC status and metadata
- Identity hash (canonical)
- Decision outcomes
- Audit logs
- User references

### What AI Agents Are Allowed to Touch
- Temporary access URLs (time-limited)
- In-memory processing only
- No local persistence
- No cache of sensitive documents
- Fetch from IPFS → process → discard

## Data Flow
1. User uploads document → Backend API
2. Backend uploads to Pinata → Receives CID
3. Backend stores CID in database
4. Backend generates temporary access URL
5. Agent receives CID + access URL
6. Agent fetches from IPFS (in-memory)
7. Agent processes document
8. Agent discards document (no persistence)
9. Agent returns extracted data
10. Backend stores results (no raw files)

## Security Considerations
- Documents never stored in backend database
- Documents never stored on blockchain
- Agents process in-memory only
- Temporary URLs expire after use
- CID provides immutable reference


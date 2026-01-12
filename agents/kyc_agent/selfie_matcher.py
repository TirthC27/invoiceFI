"""
Selfie face matching wrapper.

Face verification logic:
- Reads selfie from IPFS via CID (temporary access URL)
- Reads ID photo from IPFS via CID (temporary access URL)
- Face detection in selfie
- Face detection in ID photo
- Face comparison/scoring
- Match confidence calculation

Note: Images are fetched from IPFS, processed in-memory, then discarded.
No local persistence of selfie or ID photos.
"""


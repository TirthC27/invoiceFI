"""
KYC agent cleanup utilities.

Ensures no local persistence of sensitive documents:
- Temporary file cleanup
- In-memory buffer clearing
- Cache invalidation
- Resource cleanup after processing

Note: This module enforces that agents never persist documents locally.
All document processing must be ephemeral (in-memory only).
"""


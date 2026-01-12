"""
KYC agent input/output contracts.

Defines data structures for:
- Agent input (CID + temporary access URL, metadata) - no raw images
- Agent output (extracted data, scores)
- Intermediate processing results

Note: Input schemas include CID and temporary access URL fields.
Agents receive CIDs, not raw file data.
"""


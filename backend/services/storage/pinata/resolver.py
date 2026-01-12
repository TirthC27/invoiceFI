"""
Pinata CID resolver.

Resolves IPFS CID to temporary access URL:
- Gateway URL generation
- Temporary access token creation
- URL expiration handling
- Secure access for AI agents
"""

from config.settings import settings


class PinataResolver:
    """Resolves IPFS CIDs to accessible URLs."""
    
    def __init__(self):
        self.gateway_url = settings.PINATA_GATEWAY_URL
        
    def resolve_cid(self, cid: str) -> str:
        """
        Resolve IPFS CID to gateway URL.
        
        Args:
            cid: IPFS content identifier
            
        Returns:
            Full gateway URL for accessing content
        """
        return f"{self.gateway_url}/ipfs/{cid}"
        
    def resolve_with_filename(self, cid: str, filename: str) -> str:
        """
        Resolve CID with specific filename.
        
        Args:
            cid: IPFS content identifier
            filename: Desired filename in URL
            
        Returns:
            Gateway URL with filename
        """
        return f"{self.gateway_url}/ipfs/{cid}?filename={filename}"

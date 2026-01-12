"""
Pinata API wrapper.

Low-level Pinata API client for:
- Authentication (API key/secret)
- HTTP request handling
- Error handling
- Rate limiting
"""

from typing import Optional, Dict, Any
import aiohttp
from config.settings import settings


class PinataClient:
    """Low-level Pinata API client."""
    
    def __init__(self):
        self.api_key = settings.PINATA_API_KEY
        self.api_secret = settings.PINATA_API_SECRET
        self.base_url = "https://api.pinata.cloud"
        
    def _get_headers(self) -> Dict[str, str]:
        """Get auth headers for API requests."""
        return {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret,
        }
        
    async def test_authentication(self) -> bool:
        """Test if credentials are valid."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/data/testAuthentication",
                    headers=self._get_headers()
                ) as response:
                    return response.status == 200
        except Exception:
            return False

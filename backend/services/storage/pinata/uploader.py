"""
Pinata uploader service.

Uploads KYC documents and assets to IPFS via Pinata:
- Identity document uploads
- Selfie image uploads
- Metadata attachment
- CID generation and return
- Upload error handling
"""

from typing import Optional, Dict, Any
import aiohttp
from config.settings import settings


class PinataUploader:
    """Handles file uploads to Pinata/IPFS."""
    
    def __init__(self):
        self.api_key = settings.PINATA_API_KEY
        self.api_secret = settings.PINATA_API_SECRET
        self.base_url = "https://api.pinata.cloud"
        
    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Upload file to IPFS via Pinata.
        
        Args:
            file_content: File bytes
            filename: Original filename
            metadata: Optional metadata
            
        Returns:
            IPFS CID hash
        """
        headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret,
        }
        
        form = aiohttp.FormData()
        form.add_field('file', file_content, filename=filename)
        
        if metadata:
            form.add_field('pinataMetadata', str(metadata))
            
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/pinning/pinFileToIPFS",
                headers=headers,
                data=form
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result['IpfsHash']
                else:
                    raise Exception(f"Pinata upload failed: {await response.text()}")
                    
    async def upload_json(self, data: Dict[str, Any]) -> str:
        """
        Upload JSON data to IPFS.
        
        Args:
            data: JSON-serializable data
            
        Returns:
            IPFS CID hash
        """
        headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret,
            "Content-Type": "application/json",
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/pinning/pinJSONToIPFS",
                headers=headers,
                json=data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result['IpfsHash']
                else:
                    raise Exception(f"Pinata JSON upload failed: {await response.text()}")

"""
Application settings and configuration.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "TERRA API"
    DEBUG: bool = False
    SECRET_KEY: str = "your-secret-key-change-in-production"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/terra"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    JWT_SECRET_KEY: str = "jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Blockchain - Mantle
    MANTLE_TESTNET_RPC: str = "https://rpc.sepolia.mantle.xyz"
    MANTLE_MAINNET_RPC: str = "https://rpc.mantle.xyz"
    MANTLE_RPC_URL: str = "https://rpc.sepolia.mantle.xyz"  # Default to testnet
    CHAIN_ID: int = 5003  # Mantle Sepolia Testnet
    
    # Contract Addresses (will be updated after deployment)
    ASSET_REGISTRY_ADDRESS: str = "0x329d83B87A0299564bbD3902C2D0c5F352728e76"
    INVESTMENT_VAULT_ADDRESS: str = "0xC199E88Fb4b390180268bda69d455DEfc30B0888"
    RISK_ENGINE_ADDRESS: str = "0x8dC86064Fa95bdEff1281279942b012AAaEb8DA9"
    DEFAULT_ENGINE_ADDRESS: str = "0x7c5C4d7D1a963AE025fB8De91931ffBb39D0F298"
    RECOVERY_AUCTION_ADDRESS: str = "0x4477DE0dea818cBF7D5D4c5144C87762E4dE7715"
    LOSS_CLAIM_NFT_ADDRESS: str = "0xd491021F00D10c7b98bEC48925dA3a7A4c8472dE"
    
    # IPFS / Pinata
    PINATA_API_KEY: str = ""
    PINATA_API_SECRET: str = ""
    PINATA_SECRET_KEY: str = ""
    PINATA_JWT: str = ""
    PINATA_GATEWAY_URL: str = ""
    IPFS_GATEWAY: str = "https://gateway.pinata.cloud/ipfs/"
    
    # AI Agent Settings
    AGENT_EXECUTOR_URL: str = "http://localhost:8001"
    AGENT_QUEUE_URL: str = ""
    OCR_CONFIDENCE_THRESHOLD: float = 0.75
    FACE_MATCH_THRESHOLD: float = 0.80
    FUZZY_MATCH_THRESHOLD: int = 80
    
    # KYC Settings
    KYC_API_KEY: str = ""
    KYC_ENABLED: bool = True
    
    # Email (for Escalation Agent)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

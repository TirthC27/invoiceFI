"""
Initialize database tables.

Run this script to create all tables in the Supabase PostgreSQL database.
Usage: python -m db.init_db
"""

import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_path = str(Path(__file__).parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from db.database import engine, Base
from config.settings import settings


async def init_db():
    """
    Create all database tables.
    
    Run this script once to initialize the database schema.
    Safe to run multiple times (idempotent).
    """
    print("Creating database tables...")
    print(f"Database URL: {settings.DATABASE_URL[:50]}...")
    
    try:
        # Import all models to register them with Base
        from db.models import (
            User,
            KYCProfile,
            KYCAuditLog,
            Asset,
            Investment,
            Payment,
            BlockchainEvent,
            AgentLog,
            Event,
            RecoveryBid
        )
        
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Database tables created successfully!")
        print("\nTables created:")
        for table in Base.metadata.sorted_tables:
            print(f"  - {table.name}")
            
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(init_db())

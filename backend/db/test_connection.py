"""
Test database connection without creating tables.
"""

import asyncio
import sys
from pathlib import Path

backend_path = str(Path(__file__).parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from dotenv import load_dotenv
load_dotenv()

from config.settings import settings


async def test_connection():
    """Test database connection."""
    print("Testing database connection...")
    
    # Validate URL format
    if not settings.DATABASE_URL.startswith("postgresql+asyncpg://"):
        print(f"❌ ERROR: DATABASE_URL must use asyncpg driver")
        print(f"Current: {settings.DATABASE_URL[:50]}")
        print(f"Expected: postgresql+asyncpg://...")
        return
    
    print(f"Database URL: {settings.DATABASE_URL[:70]}...")
    
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        import ssl
        
        # Create SSL context that doesn't verify certificates
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Create test engine with SSL via connect_args
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=True,
            connect_args={"ssl": ssl_context}
        )
        
        # Try to connect
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("\n✅ Database connection successful!")
            print(f"Test query result: {result.scalar()}")
            
        await engine.dispose()
        
    except Exception as e:
        print(f"\n❌ Database connection failed: {e}")
        print("\nPossible issues:")
        print("1. Check your DATABASE_URL format: postgresql+asyncpg://...")
        print("2. Verify Supabase password is correct")
        print("3. Ensure your IP is whitelisted in Supabase")
        print("4. Check if Supabase project is paused/inactive")
        print("5. Verify network/firewall settings")
        raise


if __name__ == "__main__":
    asyncio.run(test_connection())

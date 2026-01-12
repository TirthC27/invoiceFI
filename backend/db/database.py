"""
Database configuration and session management.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from config.settings import settings
import ssl

# Validate DATABASE_URL uses async driver
if not settings.DATABASE_URL.startswith("postgresql+asyncpg://"):
    raise ValueError(
        "DATABASE_URL must use asyncpg driver. "
        f"Current: {settings.DATABASE_URL[:30]}... "
        "Expected format: postgresql+asyncpg://..."
    )

# Create SSL context that doesn't verify certificates (required for some Supabase configs)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create async engine with SSL via connect_args (required for asyncpg + Supabase)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"ssl": ssl_context},
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for models
Base = declarative_base()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

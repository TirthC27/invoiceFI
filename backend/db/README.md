# TERRA Database Setup Guide

## Overview
This database layer provides real data storage for the TERRA/FailSafeRWA project using PostgreSQL (Supabase) with SQLAlchemy ORM.

**CRITICAL**: Only KYC verification logic is mocked. ALL database storage is REAL and production-ready.

## Architecture

- **Database**: PostgreSQL via Supabase
- **ORM**: SQLAlchemy (async)
- **Connection**: Direct via DATABASE_URL (no Supabase SDK)
- **Source of Truth**: Blockchain for money/state, Database for identity/metadata/logs

## Database Tables

### Core Tables
1. **users** - User accounts with wallet addresses, roles, KYC status
2. **kyc_profiles** - KYC data storage (documents, extracted info, scores)
3. **kyc_audit_logs** - Compliance audit trail for KYC operations
4. **assets** - Mirror of on-chain asset state
5. **investments** - Mirror of on-chain investment positions
6. **payments** - Scheduled and actual payment records
7. **blockchain_events** - Indexed events from smart contracts
8. **agent_logs** - AI agent execution logs
9. **events** - System event timeline
10. **recovery_bids** - Recovery auction bid tracking

## Setup Instructions

### 1. Configure Database Connection

Edit `backend/.env` and set your Supabase credentials:

```env
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres
```

**Where to find these values:**
- Log into Supabase dashboard
- Go to Project Settings > Database
- Copy the connection string
- Replace `postgres://` with `postgresql+asyncpg://`
- Insert your database password

### 2. Initialize Database Tables

Run the initialization script:

```bash
cd backend
python -m db.init_db
```

This will:
- Connect to your Supabase database
- Create all required tables
- Set up indexes and constraints
- Display success confirmation

**Expected Output:**
```
Creating database tables...
Database URL: postgresql+asyncpg://postgres:***@db.yxljjbt...
✅ Database tables created successfully!

Tables created:
  - users
  - kyc_profiles
  - kyc_audit_logs
  - assets
  - investments
  - payments
  - blockchain_events
  - agent_logs
  - events
  - recovery_bids
```

### 3. Verify Setup

The tables are now ready. Start the backend:

```bash
cd backend
python -m uvicorn main:app --reload
```

## Model Reference

### User
```python
from db.models import User, UserRole, KYCStatus

user = User(
    wallet_address="0x123...",
    role=UserRole.INVESTOR,
    kyc_status=KYCStatus.NOT_STARTED
)
```

### KYC Profile
```python
from db.models import KYCProfile

kyc = KYCProfile(
    user_id=user.id,
    wallet_address=user.wallet_address,
    document_cid="Qm...",
    full_name="John Doe",
    ocr_confidence=0.95
)
```

### Asset
```python
from db.models import Asset, AssetStatus, RiskLevel

asset = Asset(
    asset_id="0xabc...",
    issuer_address="0x123...",
    name="Solar Farm A",
    status=AssetStatus.ACTIVE,
    risk_level=RiskLevel.MEDIUM
)
```

### Agent Log
```python
from db.models import AgentLog

log = AgentLog(
    agent_name="kyc_ocr_agent",
    entity_type="kyc_profile",
    entity_id=str(kyc.id),
    level="info",
    message="OCR extraction completed"
)
```

### Event
```python
from db.models import Event

event = Event(
    event_type="kyc_submitted",
    source="user",
    payload={"user_id": user.id, "document_type": "passport"}
)
```

### Recovery Bid
```python
from db.models import RecoveryBid

bid = RecoveryBid(
    asset_address="0xabc...",
    asset_id="0xdef...",
    bidder_wallet="0x456...",
    amount=1000000000000000000,  # Wei
    bid_number=1
)
```

## Database Session Management

### In FastAPI Routes (Async)
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db

@router.get("/users/{wallet}")
async def get_user(wallet: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.wallet_address == wallet))
    user = result.scalar_one_or_none()
    return user
```

### In Workers (Sync)
```python
from db.database import get_db_session

def process_kyc():
    db = next(get_db_session())
    try:
        user = db.query(User).filter(User.wallet_address == wallet).first()
        # ... process
        db.commit()
    finally:
        db.close()
```

## Common Operations

### Create User
```python
async with async_session_maker() as session:
    user = User(wallet_address="0x123...", role=UserRole.INVESTOR)
    session.add(user)
    await session.commit()
    await session.refresh(user)
```

### Query with Join
```python
from sqlalchemy import select

async with async_session_maker() as session:
    stmt = select(User, KYCProfile).join(KYCProfile).where(User.kyc_status == KYCStatus.APPROVED)
    result = await session.execute(stmt)
    users_with_kyc = result.all()
```

### Update Status
```python
async with async_session_maker() as session:
    user = await session.get(User, user_id)
    user.kyc_status = KYCStatus.APPROVED
    user.kyc_completed_at = datetime.utcnow()
    await session.commit()
```

## Troubleshooting

### Connection Failed
- Verify DATABASE_URL format: `postgresql+asyncpg://...`
- Check Supabase password is correct
- Ensure your IP is whitelisted in Supabase (or disable IP restrictions)
- Test connection: `psql -h db.[project].supabase.co -U postgres -d postgres`

### Import Errors
- Ensure all models are imported in `db/models/__init__.py`
- Run from backend directory: `cd backend && python -m db.init_db`
- Check Python path includes backend directory

### Tables Not Created
- Check database permissions
- Verify Supabase project is active
- Review error output from init_db.py
- Manually check Supabase SQL Editor

## Production Considerations

- ✅ Connection pooling configured (pool_size=10, max_overflow=20)
- ✅ Pool pre-ping enabled for stale connection detection
- ✅ Indexes on all foreign keys and frequently queried fields
- ✅ Timestamps with automatic updates
- ✅ JSONB for flexible data storage where needed
- ⚠️ Migrations: Add Alembic for production schema migrations
- ⚠️ Backups: Configure Supabase automated backups
- ⚠️ Monitoring: Add database query logging and metrics

## Next Steps

1. ✅ Configure DATABASE_URL in .env
2. ✅ Run `python -m db.init_db`
3. ✅ Start backend server
4. ⏭️ Test KYC workflow end-to-end
5. ⏭️ Set up Alembic for migrations
6. ⏭️ Configure production monitoring

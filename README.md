# 🌍 InvoiceFI - Tokenized Environmental Risk & Recovery Assets

A blockchain-based platform for tokenizing real-world assets, managing investment risks, and facilitating transparent recovery auctions on Mantle L2.

## 🏗️ Architecture

InvoiceFI is a full-stack Web3 application combining:
- **Smart Contracts** (Solidity) for on-chain asset management
- **AI Agents** (Python) for KYC verification and document processing
- **FastAPI Backend** for business logic and data persistence
- **Next.js Frontend** for user experience
- **PostgreSQL** for structured data
- **IPFS** for decentralized storage

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Smart Contracts](#-smart-contracts)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [AI Agents](#-ai-agents)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Developers](#-developers)
- [License](#-license)

---

## ✨ Features

### 🔐 KYC & Identity Verification
- AI-powered document verification using OCR (Tesseract)
- Facial recognition for selfie matching
- Multi-step verification workflow
- Blockchain-anchored audit logs

### 💎 Asset Tokenization
- Convert real-world assets into ERC-721 tokens
- IPFS-backed metadata storage
- Comprehensive asset valuation and risk scoring
- Automated compliance checks

### 💰 Investment Management
- Fractional investment in tokenized assets
- Real-time risk assessment using RiskEngine smart contract
- Automated yield distribution
- Portfolio tracking and analytics

### ⚠️ Default & Recovery
- Transparent default detection
- Decentralized recovery auctions
- NFT-based loss claims (LossClaimNFT)
- Fair fund distribution to investors

### 🔗 Blockchain Integration
- Deployed on **Mantle Sepolia Testnet** (Chain ID: 5003)
- Gas-efficient L2 transactions
- Event indexing and real-time updates
- Wallet integration (MetaMask, WalletConnect, Coinbase Wallet)

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript 5.3** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **wagmi 2.5** - React hooks for Ethereum
- **viem 2.7** - TypeScript Ethereum library
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation
- **Recharts** - Data visualization

### Backend
- **FastAPI 0.109** - Modern Python web framework
- **SQLAlchemy 2.0** - Async ORM
- **PostgreSQL** - Primary database (Supabase)
- **asyncpg** - Async PostgreSQL driver
- **Celery 5.3** - Distributed task queue
- **Redis 5.0** - Cache and message broker
- **python-jose** - JWT authentication
- **Web3.py 6.13** - Ethereum library

### AI Agents
- **pytesseract** - OCR engine
- **OpenCV** - Image processing
- **transformers** - NLP models
- **sentence-transformers** - Semantic similarity
- **spaCy** - NLP pipeline
- **fuzzywuzzy** - Fuzzy string matching

### Blockchain
- **Solidity 0.8.20** - Smart contract language
- **Hardhat 2.19** - Development environment
- **OpenZeppelin 5.0** - Security-audited contracts
- **ethers.js 6.0** - Ethereum library
- **Mantle L2** - Deployment network

### Storage & Infrastructure
- **IPFS (Pinata)** - Decentralized file storage
- **Supabase** - PostgreSQL hosting
- **Upstash** - Redis hosting

---

## 📜 Smart Contracts

### Deployed Addresses (Mantle Sepolia - Chain ID: 5003)

| Contract | Address | Purpose |
|----------|---------|---------|
| **AssetRegistry** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Asset tokenization and registry |
| **InvestmentVault** | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | Investment tracking and distribution |
| **RiskEngine** | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | Risk scoring and analysis |
| **DefaultEngine** | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` | Default detection and handling |
| **RecoveryAuction** | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` | Asset recovery auctions |
| **LossClaimNFT** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Loss claim tokenization |

### Contract Features

**AssetRegistry**
- Mint ERC-721 asset tokens
- Store metadata on IPFS
- Track asset lifecycle
- Role-based access control

**InvestmentVault**
- Handle deposits and withdrawals
- Calculate proportional returns
- Emergency pause functionality
- Automated yield distribution

**RiskEngine**
- Dynamic risk scoring (0-1000)
- Multiple risk factors (market, credit, operational)
- Time-weighted risk calculation
- Integration with external oracles

**DefaultEngine**
- Automated default detection
- Grace period management
- Recovery initiation
- Historical default tracking

**RecoveryAuction**
- English auction mechanism
- Minimum bid increments
- Automatic winner selection
- Funds distribution to investors

**LossClaimNFT**
- Mint loss claim tokens
- Verify claim eligibility
- Track claim status
- Non-transferable claims

---

## 📁 Project Structure

```
InvoiceFI/
├── contracts/              # Smart contracts (Solidity)
│   ├── AssetRegistry.sol
│   ├── InvestmentVault.sol
│   ├── RiskEngine.sol
│   ├── DefaultEngine.sol
│   ├── RecoveryAuction.sol
│   └── LossClaimNFT.sol
│
├── backend/               # FastAPI backend
│   ├── api/              # API routes
│   │   ├── auth/
│   │   ├── kyc/
│   │   ├── assets/
│   │   └── blockchain/
│   ├── config/           # Configuration
│   ├── db/               # Database models
│   ├── services/         # Business logic
│   └── workers/          # Celery workers
│
├── agents/               # AI processing agents
│   ├── agent_runner.py
│   ├── agent_common/     # Shared utilities
│   └── kyc_agent/        # KYC verification
│       ├── id_extractor.py
│       ├── selfie_matcher.py
│       └── confidence_evaluator.py
│
├── frontend/             # Next.js frontend
│   └── src/
│       ├── app/          # Pages and layouts
│       ├── components/   # React components
│       ├── lib/          # Utilities
│       └── services/     # API clients
│
├── scripts/              # Deployment scripts
├── docs/                 # Documentation
└── hardhat.config.ts     # Hardhat configuration
```

---

## 🚀 Installation

### Prerequisites

- **Node.js 18+** and npm
- **Python 3.11+**
- **PostgreSQL 14+**
- **Redis 6+**
- **Git**
- **Tesseract OCR** (for AI agents)

### 1. Clone Repository

```bash
git clone https://github.com/TirthC27/invoiceFI.git
cd invoiceFI
```

### 2. Install Smart Contract Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Install AI Agent Dependencies

```bash
cd ../agents
pip install -r requirements.txt
```

### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuration

### 1. Environment Variables

Create `.env` files in the root and frontend directories:

**Root `.env`** (for smart contracts):
```env
PRIVATE_KEY=your_wallet_private_key
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
MANTLE_SCAN_API_KEY=your_mantlescan_api_key
```

**Backend `.env`** (in `backend/` directory):
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database

# JWT
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Blockchain
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
CONTRACT_ASSET_REGISTRY=0x5FbDB2315678afecb367f032d93F642f64180aa3
CONTRACT_INVESTMENT_VAULT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

# IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret
PINATA_JWT=your_pinata_jwt

# Redis
REDIS_URL=redis://localhost:6379

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

**Frontend `.env.local`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CHAIN_ID=5003
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 2. Database Setup

```bash
cd backend
python -m db.init_db
```

This creates all required tables in PostgreSQL.

---

## 🎯 Usage

### 1. Compile Smart Contracts

```bash
npx hardhat compile
```

### 2. Deploy Smart Contracts

```bash
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

### 3. Start Backend Server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### 4. Start Celery Worker (optional)

```bash
cd backend
celery -A workers.kyc_dispatcher worker --loglevel=info
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`

---

## 🤖 AI Agents

### KYC Agent

The KYC agent performs automated identity verification:

1. **ID Extraction** (`id_extractor.py`)
   - Extracts text from ID documents using Tesseract OCR
   - Parses name, DOB, ID number, address
   - Validates document structure

2. **Selfie Matching** (`selfie_matcher.py`)
   - Compares selfie photo with ID photo
   - Uses face detection (OpenCV Haar Cascades)
   - Calculates similarity score

3. **Confidence Evaluation** (`confidence_evaluator.py`)
   - Aggregates verification scores
   - Applies business rules
   - Determines approval/rejection

### Running Agents

```bash
cd agents
python agent_runner.py --profile-id <kyc_profile_id>
```

---

## 📚 API Documentation

### Authentication

**POST** `/api/auth/register`
- Register new user

**POST** `/api/auth/login`
- Login and get JWT token

### KYC

**POST** `/api/kyc/initiate`
- Start KYC process

**POST** `/api/kyc/upload-id`
- Upload ID document

**POST** `/api/kyc/upload-selfie`
- Upload selfie photo

**GET** `/api/kyc/status/{profile_id}`
- Check verification status

### Assets

**POST** `/api/assets`
- Create new asset

**GET** `/api/assets`
- List all assets

**GET** `/api/assets/{asset_id}`
- Get asset details

**POST** `/api/assets/{asset_id}/tokenize`
- Mint asset NFT

### Investments

**POST** `/api/investments`
- Create investment

**GET** `/api/investments/portfolio`
- Get user portfolio

### Blockchain

**POST** `/api/blockchain/index-events`
- Manually trigger event indexing

**GET** `/api/blockchain/events/{tx_hash}`
- Get events for transaction

---

## 🌐 Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

### Backend (Railway/Render)

```bash
cd backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Smart Contracts (Mantle Mainnet)

Update `hardhat.config.ts` with mainnet RPC:

```bash
npx hardhat run scripts/deploy.ts --network mantleMainnet
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **Frontend**: ESLint + Prettier
- **Backend**: Black + isort + flake8
- **Smart Contracts**: Solhint
- **TypeScript**: Strict mode enabled
- **Python**: Type hints required

---

## 👨‍💻 Developers

This project was developed by:

- **Tirth Chudasama** - [GitHub](https://github.com/TirthC27)
- **Mohite Nippanikar**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **GitHub**: https://github.com/TirthC27/invoiceFI
- **Mantle Explorer**: https://sepolia.mantlescan.xyz
- **Documentation**: `/docs`

---

## 🙏 Acknowledgments

- **Mantle Network** - For L2 infrastructure
- **OpenZeppelin** - For secure smart contract libraries
- **Pinata** - For IPFS storage
- **Supabase** - For database hosting
- **Tesseract** - For OCR capabilities

---

## 📞 Support

For questions or support, please open an issue on GitHub or contact the developers.

---

**Built with ❤️ using Web3, AI, and modern full-stack technologies**

# TERRA Platform - Quick Start Guide

## ✅ Prerequisites Installed
- ✅ Node.js (npm working)
- ✅ Hardhat blockchain node
- ⚠️ Python (not detected - backend won't run without it)

## 🚀 Running the Project

### Step 1: Start Blockchain Node (✅ RUNNING)

The Hardhat node is already running on `http://127.0.0.1:8545`

**Available Test Accounts:**
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Balance: 10000 ETH
```

### Step 2: Deploy Smart Contracts

Open a new terminal and run:
```powershell
cd C:\Users\chuda\OneDrive\Desktop\terra\blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

This will deploy all 6 contracts and output their addresses.

### Step 3: Start Frontend

```powershell
cd C:\Users\chuda\OneDrive\Desktop\terra\frontend
npm run dev
```

Frontend will be available at: **http://localhost:3000**

### Step 4: Start Backend (REQUIRES PYTHON)

⚠️ **Python is not detected on your system.** 

To run the backend, you need to:

1. **Install Python 3.11+** from https://www.python.org/downloads/
2. **Create virtual environment:**
   ```powershell
   cd C:\Users\chuda\OneDrive\Desktop\terra\backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Set up environment:**
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your database URL
   ```

5. **Run backend:**
   ```powershell
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

Backend will be available at: **http://localhost:8000**

## 🌐 Access Points

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:3000 | Ready to start |
| **Backend API** | http://localhost:8000 | Needs Python |
| **API Docs** | http://localhost:8000/docs | Needs Python |
| **Blockchain** | http://127.0.0.1:8545 | ✅ Running |

## 📱 What You Can Do Now

### Without Backend (Frontend Only Mode):
- ✅ View the UI and design
- ✅ Connect wallet (MetaMask, etc.)
- ✅ Interact with smart contracts directly
- ⚠️ No API calls will work (auth, KYC, etc.)

### With Backend:
- ✅ Full authentication
- ✅ KYC verification
- ✅ Role-based access
- ✅ AI agent processing
- ✅ Database persistence

## 🔧 Current Configuration

**Frontend Environment** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ASSET_REGISTRY=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_INVESTMENT_VAULT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
# ... other contracts
```

**Blockchain Network:**
- Network: Local Hardhat
- Chain ID: 31337
- RPC: http://127.0.0.1:8545

## 🎯 Next Steps

1. **Deploy contracts** (see Step 2 above)
2. **Start frontend** (see Step 3 above)
3. **Install Python** if you want full functionality
4. **Connect MetaMask**:
   - Add Custom Network
   - Network Name: Local Hardhat
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
   - Import one of the test accounts using the private key

## 🐛 Troubleshooting

**Frontend won't start?**
```powershell
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

**Blockchain connection issues?**
- Make sure Hardhat node is running
- Check if port 8545 is available
- Restart the Hardhat node

**Backend issues?**
- Install Python 3.11+
- Check database connection
- Verify Redis is running (for Celery)

## 📚 Documentation

- Full docs: [README.md](README.md)
- Deployment info: [DEPLOYMENT.md](DEPLOYMENT.md)
- Smart contracts: [blockchain/contracts/](blockchain/contracts/)

# TERRA Smart Contract Deployment

## ✅ Deployment Completed

**Network:** Local Hardhat (for development)  
**Chain ID:** 31337  
**Deployer Account:** 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  
**Date:** January 12, 2026

## 📋 Deployed Contract Addresses

| Contract | Address |
|----------|---------|
| **AssetRegistry** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| **InvestmentVault** | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| **RiskEngine** | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| **DefaultEngine** | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| **RecoveryAuction** | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` |
| **LossClaimNFT** | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |

## ✅ Configuration Completed

The deployment script automatically configured all contract connections:

- ✅ RiskEngine authorized on AssetRegistry
- ✅ DefaultEngine authorized on InvestmentVault  
- ✅ RecoveryAuction set on DefaultEngine
- ✅ DefaultEngine authorized on RecoveryAuction
- ✅ Minter role granted to RecoveryAuction on LossClaimNFT

## 📁 Environment Files Updated

Contract addresses have been updated in:
- ✅ `/backend/.env.example`
- ✅ `/.env.example`
- ✅ `/blockchain/.env`

## 🚀 Next Steps

### For Local Development:
1. Start Hardhat node:
   ```bash
   cd blockchain
   npx hardhat node
   ```

2. Deploy contracts (already done):
   ```bash
   npx hardhat run scripts/deploy.ts --network hardhat
   ```

3. Start backend:
   ```bash
   cd backend
   cp .env.example .env
   # Configure database and other settings
   uvicorn main:app --reload
   ```

4. Start frontend:
   ```bash
   cd frontend
   cp .env.example .env.local
   npm run dev
   ```

### For Mantle Testnet Deployment:

⚠️ **Note:** The current deployer wallet needs testnet MNT tokens.

1. Get testnet MNT from faucet:
   - Visit: https://faucet.testnet.mantle.xyz
   - Use wallet: 0x727f6afcAb680Aa8Bb34819cAc09C95ac73B9762

2. Update `.env` with your private key that has testnet funds

3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.ts --network mantleTestnet
   ```

4. Update environment files with new addresses

## 🔍 Contract Verification

For Mantle Testnet verification:
```bash
npx hardhat verify --network mantleTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

Example:
```bash
npx hardhat verify --network mantleTestnet 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## 📊 Deployment Details

- **Total Contracts:** 6
- **Gas Used:** ~15M gas (estimated)
- **Deployment Time:** ~30 seconds
- **Status:** ✅ All contracts deployed successfully
- **Roles Configured:** ✅ Yes
- **Inter-contract connections:** ✅ Yes

## 🔗 Contract Interactions

Contracts are fully integrated:
- AssetRegistry ← RiskEngine (updates risk scores)
- InvestmentVault ← DefaultEngine (triggers defaults)
- DefaultEngine ← RecoveryAuction (creates auctions)
- RecoveryAuction → LossClaimNFT (mints loss claims)

## 📝 Notes

- Current deployment is on **local Hardhat network** for development
- For production use, deploy to **Mantle Mainnet** with properly secured private keys
- Always verify contracts on blockchain explorer after deployment
- Keep deployment addresses confidential if using real funds

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeployedContracts {
  assetRegistry: string;
  investmentVault: string;
  riskEngine: string;
  defaultEngine: string;
  recoveryAuction: string;
  lossClaimNFT: string;
  network: string;
  chainId: number;
  deployedAt: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("");

  // 1. Deploy AssetRegistry
  console.log("1. Deploying AssetRegistry...");
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.deploy();
  await assetRegistry.waitForDeployment();
  const assetRegistryAddress = await assetRegistry.getAddress();
  console.log("   AssetRegistry deployed to:", assetRegistryAddress);

  // 2. Deploy LossClaimNFT
  console.log("2. Deploying LossClaimNFT...");
  const LossClaimNFT = await ethers.getContractFactory("LossClaimNFT");
  const lossClaimNFT = await LossClaimNFT.deploy();
  await lossClaimNFT.waitForDeployment();
  const lossClaimNFTAddress = await lossClaimNFT.getAddress();
  console.log("   LossClaimNFT deployed to:", lossClaimNFTAddress);

  // 3. Deploy InvestmentVault (needs AssetRegistry)
  console.log("3. Deploying InvestmentVault...");
  const InvestmentVault = await ethers.getContractFactory("InvestmentVault");
  const investmentVault = await InvestmentVault.deploy(assetRegistryAddress);
  await investmentVault.waitForDeployment();
  const investmentVaultAddress = await investmentVault.getAddress();
  console.log("   InvestmentVault deployed to:", investmentVaultAddress);

  // 4. Deploy RiskEngine (needs AssetRegistry)
  console.log("4. Deploying RiskEngine...");
  const RiskEngine = await ethers.getContractFactory("RiskEngine");
  const riskEngine = await RiskEngine.deploy(assetRegistryAddress);
  await riskEngine.waitForDeployment();
  const riskEngineAddress = await riskEngine.getAddress();
  console.log("   RiskEngine deployed to:", riskEngineAddress);

  // 5. Deploy DefaultEngine (needs AssetRegistry and RiskEngine)
  console.log("5. Deploying DefaultEngine...");
  const DefaultEngine = await ethers.getContractFactory("DefaultEngine");
  const defaultEngine = await DefaultEngine.deploy(assetRegistryAddress, riskEngineAddress);
  await defaultEngine.waitForDeployment();
  const defaultEngineAddress = await defaultEngine.getAddress();
  console.log("   DefaultEngine deployed to:", defaultEngineAddress);

  // 6. Deploy RecoveryAuction (needs AssetRegistry, LossClaimNFT, InvestmentVault)
  console.log("6. Deploying RecoveryAuction...");
  const RecoveryAuction = await ethers.getContractFactory("RecoveryAuction");
  const recoveryAuction = await RecoveryAuction.deploy(
    assetRegistryAddress,
    lossClaimNFTAddress,
    investmentVaultAddress
  );
  await recoveryAuction.waitForDeployment();
  const recoveryAuctionAddress = await recoveryAuction.getAddress();
  console.log("   RecoveryAuction deployed to:", recoveryAuctionAddress);

  // Configure roles and connections
  console.log("\n7. Configuring roles and connections...");
  
  // Set RiskEngine role on AssetRegistry
  await assetRegistry.setRiskEngineRole(riskEngineAddress);
  console.log("   - RiskEngine role set on AssetRegistry");

  // Set DefaultEngine role on InvestmentVault
  await investmentVault.setDefaultEngineRole(defaultEngineAddress);
  console.log("   - DefaultEngine role set on InvestmentVault");

  // Set RecoveryAuction on DefaultEngine
  await defaultEngine.setRecoveryAuction(recoveryAuctionAddress);
  console.log("   - RecoveryAuction set on DefaultEngine");

  // Set DefaultEngine role on RecoveryAuction
  await recoveryAuction.setDefaultEngine(defaultEngineAddress);
  console.log("   - DefaultEngine role set on RecoveryAuction");

  // Set Minter role on LossClaimNFT for RecoveryAuction
  await lossClaimNFT.setMinterRole(recoveryAuctionAddress);
  console.log("   - Minter role set on LossClaimNFT");

  // Save deployment addresses
  const deployedContracts: DeployedContracts = {
    assetRegistry: assetRegistryAddress,
    investmentVault: investmentVaultAddress,
    riskEngine: riskEngineAddress,
    defaultEngine: defaultEngineAddress,
    recoveryAuction: recoveryAuctionAddress,
    lossClaimNFT: lossClaimNFTAddress,
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
  };

  // Save to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployedContracts, null, 2));
  console.log(`\nDeployment addresses saved to: ${deploymentFile}`);

  // Print summary
  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`AssetRegistry:    ${assetRegistryAddress}`);
  console.log(`InvestmentVault:  ${investmentVaultAddress}`);
  console.log(`RiskEngine:       ${riskEngineAddress}`);
  console.log(`DefaultEngine:    ${defaultEngineAddress}`);
  console.log(`RecoveryAuction:  ${recoveryAuctionAddress}`);
  console.log(`LossClaimNFT:     ${lossClaimNFTAddress}`);
  console.log("========================================");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

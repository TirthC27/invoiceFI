import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const MANTLE_TESTNET_RPC = process.env.MANTLE_TESTNET_RPC || "https://rpc.sepolia.mantle.xyz";
const MANTLE_MAINNET_RPC = process.env.MANTLE_MAINNET_RPC || "https://rpc.mantle.xyz";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    mantleTestnet: {
      url: MANTLE_TESTNET_RPC,
      chainId: 5003,
      accounts: [PRIVATE_KEY],
    },
    mantleMainnet: {
      url: MANTLE_MAINNET_RPC,
      chainId: 5000,
      accounts: [PRIVATE_KEY],
      gasPrice: 1000000000,
    },
  },
  etherscan: {
    apiKey: {
      mantleTestnet: process.env.MANTLE_EXPLORER_API_KEY || "",
      mantleMainnet: process.env.MANTLE_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "mantleTestnet",
        chainId: 5003,
        urls: {
          apiURL: "https://api-sepolia.mantlescan.xyz/api",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
      {
        network: "mantleMainnet",
        chainId: 5000,
        urls: {
          apiURL: "https://api.mantlescan.xyz/api",
          browserURL: "https://mantlescan.xyz",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

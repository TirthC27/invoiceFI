/**
 * Pure Web Wagmi Configuration for Mantle
 * Web-only setup - no MetaMask SDK, no React Native, no RainbowKit
 * Using wagmi v1 API
 */

import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { type Chain } from 'wagmi';

// Mantle Sepolia Testnet
export const mantleSepolia: Chain = {
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://sepolia.mantlescan.xyz',
    },
  },
  testnet: true,
};

// Mantle Mainnet
export const mantleMainnet: Chain = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Explorer',
      url: 'https://mantlescan.xyz',
    },
  },
  testnet: false,
};

// Pure web-only wagmi config using window.ethereum (no SDK, no connectors import)
// MetaMask, Brave, Coinbase Extension work automatically via browser injection
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mantleSepolia, mantleMainnet],
  [publicProvider()]
);

export const config = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
});

// Contract addresses per chain
export const contractAddresses: Record<number, {
  assetRegistry: `0x${string}`;
  investmentVault: `0x${string}`;
  riskEngine: `0x${string}`;
  defaultEngine: `0x${string}`;
  recoveryAuction: `0x${string}`;
  lossClaimNFT: `0x${string}`;
}> = {
  5003: {
    assetRegistry: '0x0000000000000000000000000000000000000000',
    investmentVault: '0x0000000000000000000000000000000000000000',
    riskEngine: '0x0000000000000000000000000000000000000000',
    defaultEngine: '0x0000000000000000000000000000000000000000',
    recoveryAuction: '0x0000000000000000000000000000000000000000',
    lossClaimNFT: '0x0000000000000000000000000000000000000000',
  },
  5000: {
    assetRegistry: '0x0000000000000000000000000000000000000000',
    investmentVault: '0x0000000000000000000000000000000000000000',
    riskEngine: '0x0000000000000000000000000000000000000000',
    defaultEngine: '0x0000000000000000000000000000000000000000',
    recoveryAuction: '0x0000000000000000000000000000000000000000',
    lossClaimNFT: '0x0000000000000000000000000000000000000000',
  },
};

// Get contract address for current chain
export function getContractAddress(
  chainId: number,
  contract: keyof typeof contractAddresses[5003]
): `0x${string}` {
  const addresses = contractAddresses[chainId];
  if (!addresses) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return addresses[contract];
}

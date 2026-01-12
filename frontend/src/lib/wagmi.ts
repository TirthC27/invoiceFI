/**
 * Wagmi + RainbowKit Configuration for Mantle
 * Using explicit connectors to exclude Gemini (avoids lodash ESM issues)
 */

import { http, createConfig } from 'wagmi';
import { Chain } from 'wagmi/chains';
import {
  metaMask,
  walletConnect,
  coinbaseWallet,
  injected,
} from '@wagmi/connectors';

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

// Wagmi config - using explicit connectors to avoid Gemini (causes @metamask/utils lodash ESM error)
export const config = createConfig({
  chains: [mantleSepolia, mantleMainnet],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'TERRA',
    }),
    injected(),
  ],
  transports: {
    [mantleSepolia.id]: http(),
    [mantleMainnet.id]: http(),
  },
  ssr: true,
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

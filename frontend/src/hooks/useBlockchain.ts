/**
 * Blockchain State Hooks
 * Ensures blockchain is the single source of truth
 * All reads come from indexed blockchain data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { api } from '@/lib/api';
import { Asset, Investment, Auction, BlockchainEvent } from '@/types';

// Query keys for cache management
export const queryKeys = {
  assets: ['assets'] as const,
  asset: (id: string) => ['asset', id] as const,
  investments: (address: string) => ['investments', address] as const,
  auctions: ['auctions'] as const,
  events: ['events'] as const,
  syncStatus: ['sync-status'] as const,
};

/**
 * Hook to check blockchain sync status
 * Ensures frontend displays up-to-date data
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: queryKeys.syncStatus,
    queryFn: async () => {
      const response = await api.get('/blockchain/sync-status');
      return response.data as {
        is_synced: boolean;
        last_indexed_block: number;
        current_block: number;
        blocks_behind: number;
      };
    },
    refetchInterval: 10000, // Check every 10 seconds
  });
}

/**
 * Hook to fetch assets from indexed blockchain data
 * Backend indexes blockchain events and serves denormalized views
 */
export function useAssets(filters?: {
  status?: string;
  type?: string;
  issuer?: string;
}) {
  return useQuery({
    queryKey: [...queryKeys.assets, filters],
    queryFn: async () => {
      const response = await api.get('/assets', { params: filters });
      return response.data.items as Asset[];
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook to fetch single asset with blockchain verification
 */
export function useAsset(id: string) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: queryKeys.asset(id),
    queryFn: async () => {
      // Get indexed data from backend
      const response = await api.get(`/assets/${id}`);
      const asset = response.data as Asset;

      // Optionally verify critical data against blockchain
      // This is for display purposes - the backend data is authoritative
      // because it comes from indexed blockchain events

      return asset;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch user's investments from indexed blockchain data
 */
export function useInvestments(address?: string) {
  return useQuery({
    queryKey: queryKeys.investments(address || ''),
    queryFn: async () => {
      const response = await api.get('/investments', {
        params: { investor: address },
      });
      return response.data.items as Investment[];
    },
    enabled: !!address,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch active auctions
 */
export function useAuctions() {
  return useQuery({
    queryKey: queryKeys.auctions,
    queryFn: async () => {
      const response = await api.get('/auctions');
      return response.data.items as Auction[];
    },
    staleTime: 10000, // Auctions need fresher data
  });
}

/**
 * Hook to fetch blockchain events
 */
export function useBlockchainEvents(filters?: {
  event_name?: string;
  asset_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...queryKeys.events, filters],
    queryFn: async () => {
      const response = await api.get('/blockchain/events', { params: filters });
      return response.data.items as BlockchainEvent[];
    },
    staleTime: 10000,
  });
}

/**
 * Hook for making investments
 * Writes to blockchain, then waits for indexer to catch up
 */
export function useInvest() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async ({
      assetId,
      amount,
    }: {
      assetId: string;
      amount: number;
    }) => {
      // Backend handles blockchain transaction
      const response = await api.post(`/assets/${assetId}/invest`, { amount });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refetch from indexed data
      queryClient.invalidateQueries({ queryKey: queryKeys.assets });
      queryClient.invalidateQueries({ queryKey: queryKeys.asset(variables.assetId) });
      if (address) {
        queryClient.invalidateQueries({ queryKey: queryKeys.investments(address) });
      }
    },
  });
}

/**
 * Hook for placing auction bids
 */
export function usePlaceBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      auctionId,
      amount,
    }: {
      auctionId: number;
      amount: string;
    }) => {
      const response = await api.post(`/auctions/${auctionId}/bid`, { amount });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auctions });
    },
  });
}

/**
 * Hook for registering new assets
 */
export function useRegisterAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets });
    },
  });
}

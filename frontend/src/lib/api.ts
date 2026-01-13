/**
 * API Client for TERRA Backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired - try refresh
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token } = response.data;
          useAuthStore.getState().setToken(access_token);
          
          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            return axios(error.config);
          }
        } catch {
          // Refresh failed - logout
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Alias for default export (backwards compatibility)
export const api = apiClient;

// ==================== Auth API ====================

export const authApi = {
  getNonce: async (walletAddress: string) => {
    const response = await apiClient.post('/auth/nonce', { wallet_address: walletAddress });
    return response.data;
  },

  verify: async (walletAddress: string, signature: string) => {
    const response = await apiClient.post('/auth/verify', {
      wallet_address: walletAddress,
      signature,
    });
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateRole: async (role: string) => {
    const response = await apiClient.post('/auth/role', { role });
    return response.data;
  },
};

// ==================== KYC API ====================

export const kycApi = {
  getStatus: async () => {
    const response = await apiClient.get('/kyc/status');
    return response.data;
  },

  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/kyc/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadSelfie: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/kyc/upload/selfie', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  submit: async () => {
    const response = await apiClient.post('/kyc/submit');
    return response.data;
  },
};

// ==================== Assets API ====================

export const assetsApi = {
  list: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/assets', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/assets/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description: string;
    asset_type: string;
    value: number;
    currency: string;
  }) => {
    const response = await apiClient.post('/assets', data);
    return response.data;
  },

  uploadDocument: async (assetId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/assets/${assetId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  submit: async (assetId: string) => {
    const response = await apiClient.post(`/assets/${assetId}/submit`);
    return response.data;
  },
};

// ==================== Blockchain API ====================

export const blockchainApi = {
  getAsset: async (assetId: number) => {
    const response = await apiClient.get(`/blockchain/assets/${assetId}`);
    return response.data;
  },

  getAssetRisk: async (assetId: number) => {
    const response = await apiClient.get(`/blockchain/assets/${assetId}/risk`);
    return response.data;
  },

  getInvestment: async (assetId: number) => {
    const response = await apiClient.get(`/blockchain/investments/${assetId}`);
    return response.data;
  },

  getAuctions: async () => {
    const response = await apiClient.get('/blockchain/auctions');
    return response.data;
  },

  getAuction: async (auctionId: number) => {
    const response = await apiClient.get(`/blockchain/auctions/${auctionId}`);
    return response.data;
  },

  getLossClaims: async () => {
    const response = await apiClient.get('/blockchain/claims');
    return response.data;
  },

  getEvents: async (params?: { contract_name?: string; event_name?: string; limit?: number }) => {
    const response = await apiClient.get('/blockchain/events', { params });
    return response.data;
  },

  buildInvestTx: async (assetId: number, amount: number) => {
    const response = await apiClient.post('/blockchain/tx/invest', {
      asset_id: assetId,
      amount,
    });
    return response.data;
  },

  buildClaimReturnsTx: async (assetId: number) => {
    const response = await apiClient.post(`/blockchain/tx/claim-returns?asset_id=${assetId}`);
    return response.data;
  },

  buildBidTx: async (auctionId: number, amount: number) => {
    const response = await apiClient.post(`/blockchain/tx/bid?auction_id=${auctionId}&amount=${amount}`);
    return response.data;
  },
};

// ==================== Investments API ====================

export const investmentsApi = {
  list: async () => {
    const response = await apiClient.get('/investments');
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/investments/${id}`);
    return response.data;
  },
};

// ==================== Payments API ====================

export const paymentsApi = {
  listForAsset: async (assetId: string) => {
    const response = await apiClient.get(`/assets/${assetId}/payments`);
    return response.data;
  },

  submitPayment: async (assetId: string, amount: number) => {
    const response = await apiClient.post(`/assets/${assetId}/payments`, { amount });
    return response.data;
  },
};

// ==================== Dashboard API ====================

export const dashboardApi = {
  investor: async () => {
    const response = await apiClient.get('/dashboard/investor');
    return response.data;
  },

  issuer: async () => {
    const response = await apiClient.get('/dashboard/issuer');
    return response.data;
  },

  recovery: async () => {
    const response = await apiClient.get('/dashboard/recovery');
    return response.data;
  },

  admin: async () => {
    const response = await apiClient.get('/dashboard/admin');
    return response.data;
  },
};

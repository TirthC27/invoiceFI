/**
 * Auth Store - Zustand state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole, KYCStatus } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateKYCStatus: (status: KYCStatus) => void;
  updateRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user }),
      
      setToken: (token) => set({ token }),
      
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      
      setLoading: (isLoading) => set({ isLoading }),

      login: (user, token, refreshToken) =>
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      updateKYCStatus: (status) =>
        set((state) => ({
          user: state.user ? { ...state.user, kyc_status: status } : null,
        })),

      updateRole: (role) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        })),
    }),
    {
      name: 'terra-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsKYCApproved = (state: AuthState) => 
  state.user?.kyc_status === KYCStatus.APPROVED;
export const selectUserRole = (state: AuthState) => state.user?.role;

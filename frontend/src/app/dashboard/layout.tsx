'use client';

/**
 * Dashboard Layout - Role-based routing
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { isAuthenticated, login, logout, setLoading, token } = useAuthStore();

  // Handle wallet connection state
  useEffect(() => {
    const initAuth = async () => {
      if (!isConnected || !address) {
        logout();
        router.push('/');
        return;
      }

      // If we have a token, verify it's still valid
      if (token) {
        try {
          const user = await authApi.me();
          if (user.wallet_address.toLowerCase() !== address.toLowerCase()) {
            // Different wallet - need to re-authenticate
            logout();
          }
          setLoading(false);
        } catch {
          // Token invalid
          logout();
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, [isConnected, address, token]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

/**
 * Dashboard Home - Role-based redirect
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // Redirect based on role
    switch (user.role) {
      case UserRole.INVESTOR:
        router.push('/dashboard/investor');
        break;
      case UserRole.ASSET_ISSUER:
        router.push('/dashboard/issuer');
        break;
      case UserRole.RECOVERY_PARTNER:
        router.push('/dashboard/recovery');
        break;
      case UserRole.ADMIN:
        router.push('/dashboard/admin');
        break;
      default:
        router.push('/dashboard/investor');
    }
  }, [user, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

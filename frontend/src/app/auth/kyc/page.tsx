'use client';

/**
 * KYC flow router.
 * 
 * Orchestrates the KYC flow:
 * - Route navigation between steps
 * - State management
 * - Progress tracking
 * - Flow completion
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KYCFlow() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main KYC page
    router.push('/kyc');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terra-600"></div>
    </div>
  );
}


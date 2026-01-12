'use client';

/**
 * KYC Banner - Shows KYC status and prompts completion
 */

import Link from 'next/link';
import { KYCStatus } from '@/types';

interface KYCBannerProps {
  status: KYCStatus;
}

export function KYCBanner({ status }: KYCBannerProps) {
  if (status === KYCStatus.APPROVED) {
    return null;
  }

  const config = {
    [KYCStatus.NOT_STARTED]: {
      title: 'Complete Your KYC',
      description: 'You need to verify your identity before you can invest in assets.',
      buttonText: 'Start KYC',
      buttonHref: '/auth/kyc',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      iconColor: 'text-yellow-600',
    },
    [KYCStatus.PENDING]: {
      title: 'KYC Under Review',
      description: 'Your identity verification is being processed. This usually takes 1-2 business days.',
      buttonText: 'View Status',
      buttonHref: '/auth/kyc',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-700',
      iconColor: 'text-blue-600',
    },
    [KYCStatus.REJECTED]: {
      title: 'KYC Rejected',
      description: 'Your identity verification was not successful. Please review the feedback and try again.',
      buttonText: 'Retry KYC',
      buttonHref: '/auth/kyc',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      iconColor: 'text-red-600',
    },
  };

  const { title, description, buttonText, buttonHref, bgColor, borderColor, iconColor } = 
    config[status] || config[KYCStatus.NOT_STARTED];

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-6`}>
      <div className="flex items-start">
        <div className={`${iconColor} mr-4`}>
          {status === KYCStatus.PENDING ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : status === KYCStatus.REJECTED ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{description}</p>
          <Link
            href={buttonHref}
            className="inline-block mt-4 btn-primary"
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * KYC Verification Flow - Main Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { KYCStatus } from '@/types';

type Step = 'info' | 'document' | 'selfie' | 'review' | 'complete';

export default function KYCPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    nationality: '',
    address: '',
    document_type: 'passport',
    document_number: '',
    document_front: null as File | null,
    document_back: null as File | null,
    selfie: null as File | null,
  });

  useEffect(() => {
    if (user?.kyc_status === 'approved') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, [field]: file });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) {
          form.append(key, value);
        } else if (value) {
          form.append(key, String(value));
        }
      });

      await api.post('/kyc/submit', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refreshUser();
      setStep('complete');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'info':
        return !!(formData.full_name && formData.date_of_birth && formData.nationality && formData.address);
      case 'document':
        return !!(formData.document_type && formData.document_number && formData.document_front);
      case 'selfie':
        return !!formData.selfie;
      default:
        return true;
    }
  };

  if (user?.kyc_status === 'pending') {
    return <KYCPendingView />;
  }

  if (user?.kyc_status === 'rejected') {
    return <KYCRejectedView onRetry={() => setStep('info')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {(['info', 'document', 'selfie', 'review'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step === s
                      ? 'bg-terra-600 text-white'
                      : ['info', 'document', 'selfie', 'review'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {['info', 'document', 'selfie', 'review'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      ['info', 'document', 'selfie', 'review'].indexOf(step) > i
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    style={{ width: '60px' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>Info</span>
            <span>Document</span>
            <span>Selfie</span>
            <span>Review</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {step === 'info' && (
            <PersonalInfoStep
              data={formData}
              onChange={handleInputChange}
            />
          )}

          {step === 'document' && (
            <DocumentStep
              data={formData}
              onChange={handleInputChange}
              onFileChange={handleFileChange}
            />
          )}

          {step === 'selfie' && (
            <SelfieStep
              data={formData}
              onFileChange={handleFileChange}
            />
          )}

          {step === 'review' && (
            <ReviewStep data={formData} />
          )}

          {step === 'complete' && (
            <CompleteStep />
          )}

          {/* Navigation */}
          {step !== 'complete' && (
            <div className="flex justify-between mt-6 pt-4 border-t">
              {step !== 'info' ? (
                <button
                  onClick={() => {
                    const steps: Step[] = ['info', 'document', 'selfie', 'review'];
                    const idx = steps.indexOf(step);
                    setStep(steps[idx - 1]);
                  }}
                  className="btn-secondary"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step === 'review' ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Submitting...' : 'Submit KYC'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    const steps: Step[] = ['info', 'document', 'selfie', 'review'];
                    const idx = steps.indexOf(step);
                    setStep(steps[idx + 1]);
                  }}
                  disabled={!canProceed(step)}
                  className="btn-primary"
                >
                  Continue
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components
function PersonalInfoStep({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            name="full_name"
            className="input"
            value={data.full_name}
            onChange={onChange}
            placeholder="Enter your full legal name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date of Birth</label>
          <input
            type="date"
            name="date_of_birth"
            className="input"
            value={data.date_of_birth}
            onChange={onChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nationality</label>
          <input
            type="text"
            name="nationality"
            className="input"
            value={data.nationality}
            onChange={onChange}
            placeholder="Enter your nationality"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            name="address"
            className="input"
            value={data.address}
            onChange={onChange}
            placeholder="Enter your residential address"
          />
        </div>
      </div>
    </div>
  );
}

function DocumentStep({ data, onChange, onFileChange }: { data: any; onChange: any; onFileChange: any }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Identity Document</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Document Type</label>
          <select
            name="document_type"
            className="input"
            value={data.document_type}
            onChange={onChange}
          >
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver's License</option>
            <option value="national_id">National ID</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Document Number</label>
          <input
            type="text"
            name="document_number"
            className="input"
            value={data.document_number}
            onChange={onChange}
            placeholder="Enter document number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Document Front</label>
          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={onFileChange('document_front')}
          />
          {data.document_front && (
            <p className="text-sm text-green-600 mt-1">✓ {data.document_front.name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Document Back (optional)</label>
          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={onFileChange('document_back')}
          />
          {data.document_back && (
            <p className="text-sm text-green-600 mt-1">✓ {data.document_back.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SelfieStep({ data, onFileChange }: { data: any; onFileChange: any }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Selfie Verification</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Please upload a clear photo of yourself holding your ID document.
      </p>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="selfie-upload"
          onChange={onFileChange('selfie')}
        />
        <label htmlFor="selfie-upload" className="cursor-pointer">
          {data.selfie ? (
            <div>
              <p className="text-green-600 text-lg mb-2">✓ Photo uploaded</p>
              <p className="text-sm text-gray-500">{data.selfie.name}</p>
              <p className="text-sm text-terra-600 mt-2">Click to change</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📸</div>
              <p className="text-gray-500">Click to upload selfie</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}

function ReviewStep({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Review Your Information</h2>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-medium mb-2">Personal Info</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Name: {data.full_name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">DOB: {data.date_of_birth}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Nationality: {data.nationality}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Address: {data.address}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-medium mb-2">Document</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Type: {data.document_type}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Number: {data.document_number}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Front: {data.document_front?.name}</p>
          {data.document_back && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Back: {data.document_back.name}</p>
          )}
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-medium mb-2">Selfie</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{data.selfie?.name || 'Not uploaded'}</p>
        </div>
      </div>
    </div>
  );
}

function CompleteStep() {
  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold mb-2">KYC Submitted!</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Your verification is being processed. This usually takes 1-2 business days.
      </p>
      <a href="/dashboard" className="btn-primary">
        Go to Dashboard
      </a>
    </div>
  );
}

function KYCPendingView() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="card p-8 text-center max-w-md">
        <div className="text-6xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your KYC application is being reviewed. We'll notify you once it's complete.
        </p>
        <a href="/dashboard" className="btn-secondary">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

function KYCRejectedView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="card p-8 text-center max-w-md">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold mb-2 text-red-600">Verification Rejected</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Unfortunately, your KYC application was rejected. Please review the requirements and try again.
        </p>
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}

'use client';

/**
 * Create New Asset Page for Issuers
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { AssetType } from '@/types';

export default function CreateAssetPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'documents' | 'review'>('info');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    asset_type: AssetType.REAL_ESTATE,
    value: '',
    expected_yield: '',
    term_months: '',
    // Document data
    documents: [] as File[],
    legal_agreement: null as File | null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if (field === 'documents') {
        setFormData({ ...formData, documents: [...formData.documents, ...Array.from(files)] });
      } else {
        setFormData({ ...formData, [field]: files[0] });
      }
    }
  };

  const removeDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('description', formData.description);
      form.append('asset_type', formData.asset_type);
      form.append('value', formData.value);
      form.append('expected_yield', formData.expected_yield);
      form.append('term_months', formData.term_months);

      formData.documents.forEach((doc, i) => {
        form.append(`documents`, doc);
      });

      if (formData.legal_agreement) {
        form.append('legal_agreement', formData.legal_agreement);
      }

      const response = await api.post('/assets', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      router.push(`/assets/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  // Guard: Only issuers with KYC can create assets
  if (!user || user.role !== 'issuer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500">Only verified issuers can register assets.</p>
        </div>
      </div>
    );
  }

  if (user.kyc_status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">KYC Required</h2>
          <p className="text-gray-500 mb-4">Complete KYC verification to register assets.</p>
          <a href="/kyc" className="btn-primary">Complete KYC</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Register New Asset</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tokenize your real-world asset on the Mantle blockchain
          </p>
        </div>

        {/* Progress */}
        <div className="flex justify-between mb-8">
          {(['info', 'documents', 'review'] as const).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step === s
                    ? 'bg-terra-600 text-white'
                    : ['info', 'documents', 'review'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {['info', 'documents', 'review'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className="w-24 h-1 mx-2 bg-gray-200 dark:bg-gray-700" />}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}

          {step === 'info' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Asset Information</h2>
              
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name *</label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Commercial Property - Downtown LA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  name="description"
                  className="input h-32"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the asset, its location, condition, and investment terms..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Asset Type *</label>
                  <select
                    name="asset_type"
                    className="input"
                    value={formData.asset_type}
                    onChange={handleInputChange}
                  >
                    {Object.values(AssetType).map((type) => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Asset Value (USD) *</label>
                  <input
                    type="number"
                    name="value"
                    className="input"
                    value={formData.value}
                    onChange={handleInputChange}
                    placeholder="100000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expected Yield (% APY)</label>
                  <input
                    type="number"
                    name="expected_yield"
                    className="input"
                    value={formData.expected_yield}
                    onChange={handleInputChange}
                    placeholder="8.5"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Term (Months)</label>
                  <input
                    type="number"
                    name="term_months"
                    className="input"
                    value={formData.term_months}
                    onChange={handleInputChange}
                    placeholder="12"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'documents' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Supporting Documents</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Upload documents that verify ownership and value of the asset.
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">Asset Documents</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="doc-upload"
                    onChange={handleFileChange('documents')}
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    <div className="text-3xl mb-2">📁</div>
                    <p className="text-gray-500">Click to upload documents</p>
                    <p className="text-xs text-gray-400">PDF, JPG, PNG (max 10MB each)</p>
                  </label>
                </div>

                {formData.documents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.documents.map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <span className="text-sm">{doc.name}</span>
                        <button
                          onClick={() => removeDocument(i)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Legal Agreement</label>
                <input
                  type="file"
                  accept=".pdf"
                  className="input"
                  onChange={handleFileChange('legal_agreement')}
                />
                {formData.legal_agreement && (
                  <p className="text-sm text-green-600 mt-1">✓ {formData.legal_agreement.name}</p>
                )}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review & Submit</h2>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-medium mb-3">Asset Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-500">Name:</p>
                  <p>{formData.name}</p>
                  <p className="text-gray-500">Type:</p>
                  <p className="capitalize">{formData.asset_type.replace('_', ' ')}</p>
                  <p className="text-gray-500">Value:</p>
                  <p>${Number(formData.value).toLocaleString()}</p>
                  <p className="text-gray-500">Expected Yield:</p>
                  <p>{formData.expected_yield}% APY</p>
                  <p className="text-gray-500">Term:</p>
                  <p>{formData.term_months} months</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-medium mb-3">Description</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formData.description}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-medium mb-3">Documents</h3>
                <p className="text-sm">{formData.documents.length} supporting documents</p>
                {formData.legal_agreement && (
                  <p className="text-sm text-green-600">✓ Legal agreement attached</p>
                )}
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ By submitting, you confirm that all information is accurate and you have
                  the legal right to tokenize this asset.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            {step !== 'info' ? (
              <button
                onClick={() => {
                  const steps = ['info', 'documents', 'review'] as const;
                  const idx = steps.indexOf(step);
                  setStep(steps[idx - 1]);
                }}
                className="btn-secondary"
              >
                Back
              </button>
            ) : (
              <button onClick={() => router.back()} className="btn-secondary">
                Cancel
              </button>
            )}

            {step === 'review' ? (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : 'Register Asset'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const steps = ['info', 'documents', 'review'] as const;
                  const idx = steps.indexOf(step);
                  setStep(steps[idx + 1]);
                }}
                disabled={step === 'info' && (!formData.name || !formData.value)}
                className="btn-primary"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

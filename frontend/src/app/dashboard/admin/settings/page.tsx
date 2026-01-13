'use client';

/**
 * Admin Settings Page
 */

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import apiClient from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    min_investment: '100',
    max_investment: '1000000',
    platform_fee: '2.5',
    kyc_required: true,
    auto_approve_kyc: false,
  });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.post('/admin/settings', settings);
      setMessage('Settings saved successfully');
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Settings</h1>
      
      <div className="card p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Investment ($)</label>
            <input
              type="number"
              className="input w-full"
              value={settings.min_investment}
              onChange={(e) => setSettings({ ...settings, min_investment: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Maximum Investment ($)</label>
            <input
              type="number"
              className="input w-full"
              value={settings.max_investment}
              onChange={(e) => setSettings({ ...settings, max_investment: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Platform Fee (%)</label>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={settings.platform_fee}
              onChange={(e) => setSettings({ ...settings, platform_fee: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium">Require KYC</label>
              <p className="text-sm text-gray-500">Users must complete KYC to invest</p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.kyc_required}
              onChange={(e) => setSettings({ ...settings, kyc_required: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium">Auto-approve KYC</label>
              <p className="text-sm text-gray-500">Automatically approve AI-verified applications</p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.auto_approve_kyc}
              onChange={(e) => setSettings({ ...settings, auto_approve_kyc: e.target.checked })}
            />
          </div>

          {message && (
            <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

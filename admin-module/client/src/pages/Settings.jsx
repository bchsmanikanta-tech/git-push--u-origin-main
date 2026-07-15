import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminShell from '../components/AdminShell';
import { Settings as SettingsIcon, ShieldCheck, Database, BellRing, KeyRound, Shield } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2600);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/analytics/settings');
        if (response.data.success) setSettings(response.data.settings);
      } catch (error) {
        triggerToast('Unable to load settings', 'error');
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put('/api/analytics/settings', settings);
      if (response.data.success) triggerToast('System settings updated');
    } catch (error) {
      triggerToast('Unable to update settings', 'error');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put('/api/auth/change-password', passwordForm);
      if (response.data.success) {
        triggerToast('Password updated');
        setPasswordForm({ currentPassword: '', newPassword: '' });
      }
    } catch (error) {
      triggerToast(error.response?.data?.message || 'Unable to change password', 'error');
    }
  };

  const toggle2FA = async () => {
    try {
      const response = await axios.put('/api/auth/toggle-2fa');
      if (response.data.success) triggerToast(response.data.message);
    } catch (error) {
      triggerToast('Unable to update 2FA preferences', 'error');
    }
  };

  if (!settings) return null;

  return (
    <AdminShell title="System Settings">
      <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-900">
        {toast.show && <div className={`fixed right-4 top-20 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.message}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={saveSettings} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">System configuration</h2>
            </div>
            <div className="space-y-4">
              <input value={settings.systemName || ''} onChange={(e) => setSettings({ ...settings, systemName: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="System name" />
              <input value={settings.emailConfig?.smtpServer || ''} onChange={(e) => setSettings({ ...settings, emailConfig: { ...settings.emailConfig, smtpServer: e.target.value } })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="SMTP server" />
              <input value={settings.emailConfig?.senderEmail || ''} onChange={(e) => setSettings({ ...settings, emailConfig: { ...settings.emailConfig, senderEmail: e.target.value } })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Sender email" />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={settings.notificationSettings?.enableEmails || false} onChange={(e) => setSettings({ ...settings, notificationSettings: { ...settings.notificationSettings, enableEmails: e.target.checked } })} />
                Email notifications
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={settings.notificationSettings?.enablePush || false} onChange={(e) => setSettings({ ...settings, notificationSettings: { ...settings.notificationSettings, enablePush: e.target.checked } })} />
                Push notifications
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={settings.maintenanceMode || false} onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })} />
                Maintenance mode
              </label>
              <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save settings</button>
            </div>
          </form>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-500" /><h3 className="font-semibold text-slate-900 dark:text-white">Security posture</h3></div>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>• JWT-based admin authentication</li>
                <li>• Password hashing and rate limiting</li>
                <li>• Input sanitization and audit logging</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2"><KeyRound className="h-5 w-5 text-indigo-500" /><h3 className="font-semibold text-slate-900 dark:text-white">Change password</h3></div>
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <input type="password" required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Current password" />
                <input type="password" required value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="New password" />
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Update password</button>
              </form>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2"><Shield className="h-5 w-5 text-amber-500" /><h3 className="font-semibold text-slate-900 dark:text-white">Two-factor authentication</h3></div>
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Add an extra layer of protection for all admin sign-ins.</p>
              <button onClick={toggle2FA} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-700">Toggle 2FA</button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2"><Database className="h-5 w-5 text-cyan-500" /><h3 className="font-semibold text-slate-900 dark:text-white">Backup & restore</h3></div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Use the integrated export workflow and scheduled backups to preserve admin, vacancy, and door records.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export default Settings;

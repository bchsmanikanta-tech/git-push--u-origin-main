import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminShell from '../components/AdminShell';
import { AlertTriangle, Mail, Send, BellRing } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'Broadcast', channels: ['System'] });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2600);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/analytics/reports');
      if (response.data.success) setReports(response.data.reports || []);
    } catch (error) {
      triggerToast('Unable to fetch reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const sendNotification = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...notificationData, channels: notificationData.channels || ['System'] };
      const response = await axios.post('http://localhost:5000/api/analytics/notifications', payload);
      if (response.data.success) {
        triggerToast('Notification sent');
        setNotificationData({ title: '', message: '', type: 'Broadcast', channels: ['System'] });
      }
    } catch (error) {
      triggerToast(error.response?.data?.message || 'Unable to send notification', 'error');
    }
  };

  return (
    <AdminShell title="Reports & Notifications">
      <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-900">
        {toast.show && <div className={`fixed right-4 top-20 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.message}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reports received</h2>
                <p className="text-sm text-slate-500">Track flagged vacancies, smart doors, or suspicious activity.</p>
              </div>
              <div className="rounded-lg bg-rose-100 p-2 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
            </div>
            {loading ? <div className="text-sm text-slate-500">Loading reports…</div> : reports.map((report) => (
              <div key={report._id} className="mb-3 rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900 dark:text-white">{report.type}</div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{report.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{report.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <BellRing className="h-5 w-5 text-indigo-500" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Broadcast alert</h3>
            </div>
            <form onSubmit={sendNotification} className="space-y-4">
              <input required value={notificationData.title} onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Announcement title" />
              <textarea required value={notificationData.message} onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })} rows="4" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Announcement body" />
              <select value={notificationData.type} onChange={(e) => setNotificationData({ ...notificationData, type: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950">
                <option value="Broadcast">Broadcast</option>
                <option value="Direct">Direct</option>
              </select>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={notificationData.channels.includes('Email')} onChange={(e) => setNotificationData({ ...notificationData, channels: e.target.checked ? [...notificationData.channels, 'Email'] : notificationData.channels.filter((c) => c !== 'Email') })} />
                Send email
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={notificationData.channels.includes('Push')} onChange={(e) => setNotificationData({ ...notificationData, channels: e.target.checked ? [...notificationData.channels, 'Push'] : notificationData.channels.filter((c) => c !== 'Push') })} />
                Send push
              </label>
              <button type="submit" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><Send className="h-4 w-4" /> Send notification</button>
            </form>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export default Reports;

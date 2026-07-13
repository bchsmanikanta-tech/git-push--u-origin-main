import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminShell from '../components/AdminShell';
import { ShieldCheck } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/analytics/audit-logs', { params: { limit: 50 } });
        if (response.data.success) setLogs(response.data.logs || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <AdminShell title="Audit Logs">
      <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-500" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin audit trail</h2>
        </div>
        <p className="mb-6 text-sm text-slate-500">Every login, user action, and vacancy decision is recorded here for compliance.</p>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading audit history…</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{log.adminName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.action}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.details}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
};

export default AuditLogs;

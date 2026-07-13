import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminShell from '../components/AdminShell';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { 
  Users, 
  FileText, 
  DoorClosed, 
  AlertTriangle, 
  Download, 
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/analytics/dashboard');
      if (response.data.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleExport = (format) => {
    window.open(`http://localhost:5000/api/analytics/export/${format}?token=${localStorage.getItem('adminToken')}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 ml-64 mt-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Chart configs
  const chartLabels = data?.charts?.userTrends?.map(t => t.month) || [];
  const userTrendCounts = data?.charts?.userTrends?.map(t => t.count) || [];
  const vacancyTrendCounts = data?.charts?.vacancyTrends?.map(t => t.count) || [];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Users Registered',
        data: userTrendCounts,
        fill: true,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Vacancies Posted',
        data: vacancyTrendCounts,
        fill: true,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8'
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' }
      }
    }
  };

  const stats = data?.stats;

  return (
    <AdminShell title="Dashboard Overview">
      <main className="p-8 space-y-8">
        
        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Quick Statistics</h3>
            <p className="text-sm font-medium text-slate-400">Monitor system status, doors, vacancies and user accounts.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700">
                <Download className="h-4 w-4" />
                Export Reports
              </button>
              <div className="absolute right-0 mt-2 hidden w-44 rounded-lg border border-slate-100 bg-white shadow-xl group-hover:block dark:border-slate-800 dark:bg-slate-950">
                <button onClick={() => handleExport('users')} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900">
                  Users CSV
                </button>
                <button onClick={() => handleExport('vacancies')} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900">
                  Vacancies CSV
                </button>
                <button onClick={() => handleExport('logs')} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900">
                  Audit Logs CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Users */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Users</p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{stats?.users?.total}</h3>
              </div>
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                {stats?.users?.active} Active
              </span>
              <span>•</span>
              <span className="text-red-500 font-bold">{stats?.users?.blocked} Blocked</span>
            </div>
          </div>

          {/* Card 2: Vacancies */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Vacancies</p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{stats?.vacancies?.total}</h3>
              </div>
              <div className="rounded-lg bg-cyan-50 p-2.5 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="text-emerald-500 font-bold">{stats?.vacancies?.active} Active</span>
              <span>•</span>
              <span className="text-amber-500 font-bold">{stats?.vacancies?.pending} Pending</span>
              <span>•</span>
              <span className="text-slate-500 font-bold">{stats?.vacancies?.expired} Expired</span>
            </div>
          </div>

          {/* Card 3: Smart Doors */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Smart Doors</p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{stats?.doors?.total}</h3>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <DoorClosed className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="text-emerald-500 font-bold">{stats?.doors?.online} Online</span>
              <span>•</span>
              <span className="text-red-500 font-bold">{stats?.doors?.total - stats?.doors?.online} Offline</span>
            </div>
          </div>

          {/* Card 4: Reports */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Reports Received</p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{stats?.reports?.total}</h3>
              </div>
              <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="text-rose-500 font-bold">{stats?.reports?.pending} Pending action</span>
            </div>
          </div>

        </div>

        {/* Chart & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Chart Container */}
          <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h4 className="text-base font-bold text-slate-800 dark:text-white mb-4">Registration & Vacancy Trends</h4>
            <div className="h-72">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Recent Audit Logs Container */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Recent Activity Logs</h4>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
            <div className="space-y-4 overflow-y-auto max-h-72 pr-2">
              {data?.recentActivity?.map((log, index) => (
                <div key={index} className="flex flex-col border-b border-slate-50 pb-3 last:border-0 last:pb-0 dark:border-slate-905">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.adminName}</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">{log.action}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{log.details}</p>
                </div>
              ))}
              {(!data?.recentActivity || data?.recentActivity.length === 0) && (
                <p className="text-center text-xs font-medium text-slate-400 py-10">No recent audit logs.</p>
              )}
            </div>
          </div>

        </div>

      </main>
    </AdminShell>
  );
};

export default Dashboard;

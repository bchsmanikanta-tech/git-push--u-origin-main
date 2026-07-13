import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  DoorClosed, 
  FileText, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  AlertTriangle
} from 'lucide-react';

const Sidebar = () => {
  const { admin, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'Vacancy Management', path: '/vacancies', icon: FileText },
    { name: 'Smart Doors', path: '/smart-doors', icon: DoorClosed },
    { name: 'Reports & Feedbacks', path: '/reports', icon: AlertTriangle },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert },
    { name: 'System Settings', path: '/settings', icon: Settings }
  ];

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-950">
      {/* Brand Logo */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
          <DoorClosed className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">Smart Job Vacancy Finder System</h1>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">ADMIN PORTAL</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-205'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Theme & User profile */}
      <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
        </button>

        {/* User Card */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
          <div className="overflow-hidden">
            <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">{admin?.name || 'Admin'}</h4>
            <p className="truncate text-xs font-medium text-slate-400">{admin?.role || 'Administrator'}</p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-800"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

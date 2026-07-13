import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Shield, User } from 'lucide-react';

const Navbar = ({ title }) => {
  const { admin } = useAuth();

  return (
    <header className="fixed right-0 top-0 z-10 flex h-16 left-64 items-center justify-between border-b border-slate-200 bg-white px-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Role Badge */}
        <div className="hidden items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 sm:flex">
          <Shield className="h-3.5 w-3.5" />
          {admin?.role}
        </div>

        {/* Notifications Icon (Mocked) */}
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-300">
            <User className="h-5 w-5" />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800 dark:text-white leading-none">{admin?.name}</p>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{admin?.status}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Shield, Clock, LogOut, ExternalLink } from 'lucide-react';
import { apiLogout } from '../services/api';

export default function AdminNavbar({ timerState }) {
  const navigate = useNavigate();

  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    await apiLogout();
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Settings className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="font-display font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-2">
              Vakya-Bhed <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">Admin Console</span>
            </div>
            <p className="text-xs font-medium text-slate-500 -mt-0.5">Global Competition Orchestrator</p>
          </div>
        </div>

        {/* Live Timer Pill */}
        <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-100/90 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-brand-blue" />
            <span>Clock</span>
          </div>
          <div className="h-3.5 w-px bg-slate-300"></div>
          <div className="font-mono font-bold text-sm text-slate-900 tracking-tight">
            {formatTime(timerState?.time_remaining_seconds)}
          </div>
          <div className={`w-2 h-2 rounded-full ${timerState?.status === 'live' ? 'bg-emerald-500 animate-pulse' : timerState?.status === 'paused' ? 'bg-amber-500' : 'bg-rose-500'}`} />
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
            {timerState?.status || 'OFFLINE'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-brand-blue bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <span>Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl transition-colors active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </header>
  );
}

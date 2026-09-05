import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Clock, LogOut, ExternalLink, Trophy } from 'lucide-react';
import { apiLogout } from '../services/api';
import LeaderboardModal from './LeaderboardModal';

export default function AdminNavbar({ timerState }) {
  const navigate = useNavigate();
  const [scoreboardOpen, setScoreboardOpen] = useState(false);

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
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="VakyaBhed Logo"
              className="w-11 h-11 object-contain rounded-xl drop-shadow-sm"
            />
            <div>
              <div className="font-display font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-2">
                VakyaBhed <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">Admin Console</span>
              </div>
              <p className="text-xs font-medium text-slate-500 -mt-0.5">Global Competition Orchestrator</p>
            </div>
          </div>

          {/* Clock & Scoreboard HUD Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
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

            {/* Live Scoreboard Button */}
            <button
              onClick={() => setScoreboardOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs shadow-sm hover:shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="Open Live Scoreboard & Standings"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>Scoreboard</span>
            </button>
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
              className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl transition-colors active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Live Scoreboard Modal */}
      <LeaderboardModal
        isOpen={scoreboardOpen}
        onClose={() => setScoreboardOpen(false)}
        currentUsername="Admin"
      />
    </>
  );
}

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Trophy, Clock, LogIn, LogOut, User, Terminal, Map, BookOpen } from 'lucide-react';
import { apiLogout } from '../services/api';

export default function Navbar({ user, timerState }) {
  const location = useLocation();
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
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 select-none group">
          <div className="w-11 h-11 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="font-display font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
              Vakya-Bhed <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue">2026</span>
            </div>
            <p className="text-xs font-medium text-slate-500 -mt-0.5">AI Safety & Adversarial CTF</p>
          </div>
        </Link>

        {/* Live Timer Pill */}
        <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-100/90 border border-slate-200/90 shadow-sm">
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

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/rules"
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/rules')
                ? 'bg-blue-50 text-brand-blue'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rules</span>
          </Link>

          <Link
            to="/leaderboard"
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/leaderboard')
                ? 'bg-blue-50 text-brand-blue'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Scoreboard</span>
          </Link>

          {user && (
            <>
              <Link
                to="/levels"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/levels')
                    ? 'bg-blue-50 text-brand-blue'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Map className="w-4 h-4 text-purple-600" />
                <span>Roadmap</span>
              </Link>

              <Link
                to="/arena"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/arena')
                    ? 'bg-brand-blue text-white shadow-md shadow-blue-500/20'
                    : 'text-brand-blue bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <Terminal className="w-4 h-4 stroke-[2.5]" />
                <span>Play Arena</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Status / Action Button */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                <User className="w-3.5 h-3.5 text-brand-blue" />
                <span>{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-[2px_2px_0px_#0F172A] hover:shadow-[3px_3px_0px_#0F172A] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Team Sign In</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}

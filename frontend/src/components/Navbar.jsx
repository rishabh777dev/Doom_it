import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Trophy,
  Clock,
  LogIn,
  LogOut,
  User,
  Terminal,
  Map,
  BookOpen,
  Volume2,
  VolumeX,
  Menu,
  X
} from 'lucide-react';
import { apiLogout } from '../services/api';
import { isSoundMuted, toggleSoundMuted } from '../utils/effects';

export default function Navbar({ user, timerState }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [muted, setMuted] = useState(isSoundMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
  const homeLink = user ? (user.role === 'ADMIN' ? '/admin/dashboard' : '/levels') : '/';

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to={homeLink} className="flex items-center gap-2.5 sm:gap-3 select-none group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
              Vakya-Bhed <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue">2026</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 -mt-0.5 hidden xs:block">AI Safety & Adversarial CTF</p>
          </div>
        </Link>

        {/* Live Timer Pill (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-100/90 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-brand-blue" />
            <span className="hidden md:inline">Clock</span>
          </div>
          <div className="h-3.5 w-px bg-slate-300"></div>
          <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
            {formatTime(timerState?.time_remaining_seconds)}
          </div>
          <div className={`w-2 h-2 rounded-full ${timerState?.status === 'live' ? 'bg-emerald-500 animate-pulse' : timerState?.status === 'paused' ? 'bg-amber-500' : 'bg-rose-500'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wide">
            {timerState?.status || 'OFFLINE'}
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
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

        {/* Right Status Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio FX Toggle */}
          <button
            onClick={() => setMuted(toggleSoundMuted())}
            title={muted ? "Sound Effects Muted (Click to Unmute)" : "Sound Effects Active (Click to Mute)"}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              muted
                ? 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600'
                : 'bg-blue-50 text-brand-blue border-blue-200 hover:bg-blue-100'
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 max-w-[140px] truncate">
                <User className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                <span className="truncate">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-[2px_2px_0px_#0F172A] hover:shadow-[3px_3px_0px_#0F172A] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Team Sign In</span>
            </Link>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 py-4 space-y-3 animate-fade-in shadow-lg">
          
          {/* Mobile Clock Banner */}
          <div className="sm:hidden flex items-center justify-between p-3 rounded-2xl bg-slate-100 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock className="w-4 h-4 text-brand-blue" />
              <span>Arena Timer:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-sm text-slate-900">
                {formatTime(timerState?.time_remaining_seconds)}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                {timerState?.status || 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 pt-1">
            <Link
              to="/rules"
              className={`p-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-colors ${
                isActive('/rules') ? 'bg-blue-50 text-brand-blue' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-brand-blue" />
              <span>Rules & Guidelines</span>
            </Link>

            <Link
              to="/leaderboard"
              className={`p-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-colors ${
                isActive('/leaderboard') ? 'bg-blue-50 text-brand-blue' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Live Scoreboard</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/levels"
                  className={`p-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-colors ${
                    isActive('/levels') ? 'bg-blue-50 text-brand-blue' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Map className="w-4 h-4 text-purple-600" />
                  <span>Challenge Roadmap</span>
                </Link>

                <Link
                  to="/arena"
                  className="p-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 bg-brand-blue text-white shadow-md shadow-blue-500/20"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Enter Battle Arena</span>
                </Link>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <User className="w-4 h-4 text-brand-blue" />
                    <span>{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="mt-2 w-full p-3 rounded-2xl bg-slate-900 text-white text-center font-bold text-sm flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Arena</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

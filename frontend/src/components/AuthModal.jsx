import React, { useState } from 'react';
import { X, LogIn, Lock, User, AlertCircle, RefreshCw } from 'lucide-react';
import { apiLogin } from '../services/api';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both team name and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiLogin(username.trim(), password.trim());
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setTestCreds = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-8 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue text-white flex items-center justify-center shadow-md">
              <LogIn className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-slate-900">
                Team Sign In
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Authenticate node to enter the adversarial arena.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-blue" />
              <span>Team Name or Username</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. test_team or admin"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-blue" />
              <span>Password Key</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white transition-all"
            />
          </div>

          {/* Quick Credential Fillers for testing */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Quick Fill:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTestCreds('test_team', 'team123')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                test_team
              </button>
              <button
                type="button"
                onClick={() => setTestCreds('admin', 'admin123')}
                className="px-2 py-0.5 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-700"
              >
                admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50 transition-all mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

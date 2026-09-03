import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, Lock, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { apiLogin } from '../services/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide your team name and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiLogin(username.trim(), password.trim());
      if (data.role === 'ADMIN') {
        // If an admin logs in through participant portal, redirect to admin dashboard
        navigate('/admin/dashboard');
      } else {
        navigate('/levels');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your team credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-card p-7 sm:p-9 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900">
            Team Node Sign In
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Enter your team credentials to access the adversarial arena.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-blue" />
              <span>Team Name</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. CyberKnights or test_team"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-blue" />
              <span>Team Password Key</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white transition-all"
            />
          </div>

          {/* Quick Credential Button for local testing */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Demo credentials:</span>
            <button
              type="button"
              onClick={() => {
                setUsername('test_team');
                setPassword('password');
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand-blue font-semibold border border-blue-200 transition-colors"
            >
              Fill test_team
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50 transition-all mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authenticating Node...</span>
              </>
            ) : (
              <>
                <span>Enter Arena</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-700 underline">
            ? Return to Main Page
          </Link>
        </div>

      </div>
    </div>
  );
}

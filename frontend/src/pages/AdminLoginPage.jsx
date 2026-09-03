import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Settings, Lock, User, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { apiLogin } from '../services/api';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide administrator credentials.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiLogin(username.trim(), password.trim());
      if (data.role !== 'ADMIN') {
        setError('Access denied: Administrator privileges required.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-card p-7 sm:p-9 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-purple-600/25">
            <Settings className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900">
            Admin Console Sign In
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Restricted orchestrator node for Vakya-Bhed 2026.
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
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Username</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>Root Secret Key</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:bg-white transition-all"
            />
          </div>

          {/* Quick Credential Helper */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Setup credentials:</span>
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('admin_secure_password_123');
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold border border-purple-200 transition-colors"
            >
              Fill admin123
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md active:scale-95 disabled:opacity-50 transition-all mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Authorization...</span>
              </>
            ) : (
              <>
                <span>Access Admin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-700 underline">
            ? Return to Public Site
          </Link>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, AlertCircle, RefreshCw, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { apiLogin } from '../services/api';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          <img
            src="/logo.png"
            alt="VakyaBhed Logo"
            className="w-14 h-14 object-contain rounded-2xl mx-auto drop-shadow-sm"
          />
          <h2 className="font-display font-extrabold text-2xl text-slate-900">
            Admin Console Sign In
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Restricted orchestrator portal for VakyaBhed 2026.
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin secret key"
                className="w-full pl-4 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Hide secret key' : 'Show secret key'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
          <Link to="/" className="hover:text-slate-700 underline inline-flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Site</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

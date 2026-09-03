import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, ShieldAlert, Trophy, ArrowRight, RefreshCw } from 'lucide-react';
import { removeToken } from '../services/api';

export default function SessionSupersededModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleReclaim = () => {
    removeToken();
    window.dispatchEvent(new Event('auth_change'));
    onClose();
    navigate('/login');
  };

  const handleSpectate = () => {
    onClose();
    navigate('/leaderboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 text-center animate-scale-up">
        
        {/* Visual Badge */}
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Laptop className="w-8 h-8" />
        </div>

        {/* Header & Explanation */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Fair Play Policy Enforced</span>
          </div>

          <h3 className="font-display font-black text-2xl text-slate-900">
            Active Terminal Transferred
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed pt-1">
            Your team account was activated on another device. In accordance with competition rules,
            <strong className="text-slate-900"> only 1 active battle terminal </strong>
            is permitted per team to maintain fair play and prevent automated exploitation.
          </p>
        </div>

        {/* Role Suggestion Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            💡 Recommended Team Strategy:
          </p>
          <p className="text-slate-600 leading-relaxed">
            One member acts as the <strong>Attacker</strong> (crafting prompt injections on the active terminal), while the other acts as the <strong>Navigator</strong> (monitoring the live scoreboard and researching vulnerabilities).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleReclaim}
            className="w-full py-3.5 px-4 rounded-2xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reclaim Active Terminal on This Device</span>
          </button>

          <button
            onClick={handleSpectate}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Switch to Spectator Scoreboard</span>
          </button>
        </div>

      </div>
    </div>
  );
}

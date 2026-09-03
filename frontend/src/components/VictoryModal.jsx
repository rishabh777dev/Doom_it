import React from 'react';
import { Trophy, ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function VictoryModal({ isOpen, onClose, solvedLevel, nextLevel, scoreAwarded, totalScore }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-8 overflow-hidden animate-scale-up text-center">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-400/20 blur-3xl rounded-full pointer-events-none" />

        {/* Floating Trophy Badge */}
        <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center shadow-lg relative">
          <Trophy className="w-10 h-10 text-amber-600 animate-bounce" />
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </span>
        </div>

        {/* Banner Titles */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Sector Defense Breached!
        </div>

        <h2 className="text-2xl font-display font-black text-slate-900 mb-1">
          {solvedLevel?.title || 'Level Guardian'} Overridden!
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          You successfully cracked the secret credentials and compromised the sector's defense protocols.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Score Earned</p>
            <p className="text-2xl font-black text-amber-900">+{scoreAwarded || 100} <span className="text-xs font-bold">PTS</span></p>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider mb-1">Total Team Score</p>
            <p className="text-2xl font-black text-slate-900">{totalScore || 100} <span className="text-xs font-bold">PTS</span></p>
          </div>
        </div>

        {/* Next Target Preview Card */}
        {nextLevel ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-left flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Challenge Level</span>
              <p className="text-sm font-bold text-slate-900 truncate">{nextLevel.title}</p>
              <p className="text-xs text-slate-500 truncate">{nextLevel.objective}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 mb-6">
            <p className="text-sm font-bold text-emerald-800">🏆 All Challenge Levels in this round cleared!</p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all transform active:scale-98 cursor-pointer"
        >
          <span>{nextLevel ? `Engage ${nextLevel.title}` : 'Proceed to Mission Hub'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}

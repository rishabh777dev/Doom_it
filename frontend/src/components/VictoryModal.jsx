import React from 'react';
import { Trophy, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Receipt, Target, Lightbulb } from 'lucide-react';

export default function VictoryModal({ isOpen, onClose, solvedLevel, nextLevel, scoreAwarded, totalScore, scoreBreakdown }) {
  if (!isOpen) return null;

  // Fallback breakdown values if not populated from backend
  const base = scoreBreakdown?.base_score || 100;
  const attDeduction = scoreBreakdown?.attempt_deduction ?? 0;
  const attCount = scoreBreakdown?.attempts_used || 1;
  const attRate = scoreBreakdown?.attempt_penalty_rate || (solvedLevel?.round_id === 1 ? 2 : (solvedLevel?.round_id === 2 ? 3 : 4));
  const hintDeduction = scoreBreakdown?.hint_deduction ?? 0;
  const hintTier = scoreBreakdown?.hint_tier_used ?? 0;
  const netScore = scoreBreakdown?.final_score || scoreAwarded || 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-8 overflow-hidden animate-scale-up text-center max-h-[90vh] overflow-y-auto">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-400/20 blur-3xl rounded-full pointer-events-none" />

        {/* Floating Trophy & Defeated Sentinel */}
        <div className="mx-auto mb-4 flex items-center justify-center gap-3 relative">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-emerald-500 overflow-hidden shadow-lg relative shrink-0">
            <img
              src={`/avatars/${solvedLevel?.level_id || 1}.jpg`}
              alt={solvedLevel?.title || 'Sentinel'}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </span>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center shadow-lg shrink-0">
            <Trophy className="w-8 h-8 text-amber-600 animate-bounce" />
          </div>
        </div>

        {/* Banner Titles */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Sector Defense Breached!
        </div>

        <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 mb-1">
          {solvedLevel?.title || 'Level Guardian'} Overridden!
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mb-4">
          You successfully cracked the secret credentials and compromised the sector's defense protocols.
        </p>

        {/* Score Allocation Receipt (Bifurcation) */}
        <div className="mb-5 rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-brand-blue" />
              Score Bifurcation Breakdown
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
              Sector {solvedLevel?.level_id}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Base Score */}
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Base Challenge Score</span>
              </span>
              <span className="font-mono font-bold text-emerald-600">+{base} pts</span>
            </div>

            {/* 2. Attempt Cuts */}
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Attempt Cuts ({attCount} {attCount === 1 ? 'attempt' : 'attempts'}
                  {attCount > 1 ? ` • ${attCount - 1} extra × -${attRate} pts` : ' • 1st free'}):
                </span>
              </span>
              <span className={`font-mono font-bold ${attDeduction > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                {attDeduction > 0 ? `-${attDeduction} pts` : '0 pts'}
              </span>
            </div>

            {/* 3. Hint Cuts */}
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-700 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  Tactical Intel Cuts {hintTier > 0 ? `(Tier ${hintTier} Unlocked)` : '(No hints unlocked)'}:
                </span>
              </span>
              <span className={`font-mono font-bold ${hintDeduction > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {hintDeduction > 0 ? `-${hintDeduction} pts` : '0 pts'}
              </span>
            </div>

            {/* Total Bifurcation Calculation Bar */}
            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
              <div className="flex items-center gap-1.5">
                <span className="text-xs uppercase tracking-wider text-slate-500">Net Awarded:</span>
                <span className="text-[11px] font-mono text-slate-600 font-normal">
                  ({base} - {attDeduction} - {hintDeduction})
                </span>
              </div>
              <span className="font-mono text-emerald-600 text-base font-extrabold">
                +{netScore} PTS
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-0.5">Level Net Score</p>
            <p className="text-xl font-black text-amber-900 font-mono">+{netScore} <span className="text-[10px] font-bold">PTS</span></p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
            <p className="text-[10px] font-semibold text-brand-blue uppercase tracking-wider mb-0.5">Total Team Score</p>
            <p className="text-xl font-black text-slate-900 font-mono">{totalScore || netScore} <span className="text-[10px] font-bold">PTS</span></p>
          </div>
        </div>

        {/* Next Target Preview Card */}
        {nextLevel ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden border border-slate-300 shrink-0">
              <img
                src={`/avatars/${nextLevel.level_id}.jpg`}
                alt={nextLevel.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Next Challenge Level</span>
              <p className="text-xs font-bold text-slate-900 truncate">{nextLevel.title}</p>
              <p className="text-[11px] text-slate-500 truncate">{nextLevel.objective}</p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 mb-5">
            <p className="text-xs font-bold text-emerald-800">🏆 All Challenge Levels in this round cleared!</p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all transform active:scale-98 cursor-pointer"
        >
          <span>Continue to Challenge Roadmap</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}

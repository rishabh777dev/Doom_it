import React from 'react';
import { X, Receipt, ShieldCheck, Target, Lightbulb, CheckCircle2, Trophy, HelpCircle } from 'lucide-react';

export default function ScoreBreakdownModal({ isOpen, onClose, level, detail }) {
  if (!isOpen || !level || !detail) return null;

  const breakdown = detail.score_breakdown;
  const base = breakdown?.base_score || 100;
  const attCount = breakdown?.attempts_used || detail.attempts_used || 1;
  const attRate = breakdown?.attempt_penalty_rate || (level.round_id === 1 ? 2 : (level.round_id === 2 ? 3 : 4));
  const attDeduction = breakdown?.attempt_deduction ?? (Math.max(0, attCount - 1) * attRate);
  const hintTier = breakdown?.hint_tier_used ?? 0;
  const hintDeduction = breakdown?.hint_deduction ?? 0;
  const netScore = breakdown?.final_score || detail.score_earned || 0;

  const getRoundName = (roundId) => {
    if (roundId === 1) return 'Round 1: Password Extraction';
    if (roundId === 2) return 'Round 2: Secret Phrase Extraction';
    return 'Round 3: System Prompt Extraction';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-7 overflow-hidden animate-scale-up text-left">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border-2 border-slate-300 overflow-hidden shrink-0 shadow-sm">
              <img
                src={`/avatars/${level.level_id}.jpg`}
                alt={level.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-brand-blue">
                  Level {level.level_id < 10 ? `0${level.level_id}` : level.level_id}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {getRoundName(level.round_id)}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-display font-extrabold text-slate-900 leading-tight">
                {level.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout */}
        <div className="mt-4 mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Sector Breached & Verified</p>
              <p className="text-[10px] text-emerald-700">All security credentials extracted</p>
            </div>
          </div>
          <span className="text-sm font-extrabold font-mono text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl">
            +{netScore} PTS
          </span>
        </div>

        {/* Detailed Bifurcation Receipt */}
        <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-brand-blue" />
              Score Bifurcation & Deductions Breakdown
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              Audit Record
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* 1. Base Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">Base Challenge Score</span>
                  <p className="text-[10px] text-slate-500">Standard full credit allocation</p>
                </div>
              </div>
              <span className="font-mono font-bold text-emerald-600 text-sm">+{base} pts</span>
            </div>

            {/* 2. Attempt Deduction */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">
                    Attempt Deductions ({attCount} {attCount === 1 ? 'attempt' : 'attempts'})
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {attCount > 1
                      ? `${attCount - 1} additional attempt(s) × -${attRate} pts/attempt`
                      : 'First attempt success — zero attempt deduction'}
                  </p>
                </div>
              </div>
              <span className={`font-mono font-bold text-sm ${attDeduction > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                {attDeduction > 0 ? `-${attDeduction} pts` : '0 pts'}
              </span>
            </div>

            {/* 3. Hint Deduction */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">
                    Tactical Hint Deductions
                  </span>
                  <p className="text-[10px] text-slate-500">
                    {hintTier === 1
                      ? 'Tier 1 Intel Nudge unlocked'
                      : hintTier === 2
                      ? 'Tier 2 Tactical Exploit unlocked'
                      : 'No tactical intel unlocked — zero hint deduction'}
                  </p>
                </div>
              </div>
              <span className={`font-mono font-bold text-sm ${hintDeduction > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {hintDeduction > 0 ? `-${hintDeduction} pts` : '0 pts'}
              </span>
            </div>

            {/* Total Net Calculation */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Net Points Credited</span>
                <p className="text-[10px] text-slate-500 font-mono">
                  {base} pts - {attDeduction} pts - {hintDeduction} pts
                </p>
              </div>
              <span className="font-mono text-emerald-600 text-lg font-black">
                +{netScore} PTS
              </span>
            </div>
          </div>
        </div>

        {/* Tip footer */}
        <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          <span>
            <strong>Scoring Rule:</strong> Base score is 100 points. The 1st attempt incurs no penalty; each subsequent attempt incurs -{attRate} pts in this round. Unlocking hints applies a fixed deduction upon completion.
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
        >
          Dismiss Receipt
        </button>

      </div>
    </div>
  );
}

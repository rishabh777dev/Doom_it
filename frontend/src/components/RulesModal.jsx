import React from 'react';
import { X, BookOpen, ShieldCheck, Zap, AlertTriangle, Key } from 'lucide-react';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-8 my-auto overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
                Competition Rules & Guide
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Vakya-Bhed 2026 AI Safety & Adversarial CTF Arena.
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

        {/* Content */}
        <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-2 text-sm text-slate-700">
          
          {/* Round Architecture */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-blue" />
              <span>The 3 Competitive Rounds</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Levels 1 – 5</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Round 1: Password</h4>
                <p className="text-xs text-slate-500">Extract hidden single-word secret keys protected by persona and roleplay defenses.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Levels 6 – 9</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Round 2: Secret Phrase</h4>
                <p className="text-xs text-slate-500">Surface passphrases buried inside conditional rules, numbered directives, and sanitized system cards.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">Levels 10 – 12</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Round 3: Forced Output</h4>
                <p className="text-xs text-slate-500">Force the model to speak a strictly forbidden target sentence verbatim to trigger automatic level win!</p>
              </div>
            </div>
          </div>

          {/* Scoring System */}
          <div className="space-y-2">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Scoring Rules</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-600 pl-2">
              <li><strong>Attempt Tiering:</strong> Early solves grant maximum score. For Levels 1 & 6: Attempts 1–5 earn 100 pts, attempts 6–10 earn 75 pts, and attempts 11+ earn 50 pts.</li>
              <li><strong>Boss Levels (4, 5, 9, 10, 11, 12):</strong> Flat 100 points upon solving.</li>
              <li><strong>Hint Penalty:</strong> Revealing a level hint will deduct <strong>25 points</strong> from that level upon completion.</li>
            </ul>
          </div>

          {/* Rate Limiting */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-1">
              <span className="font-bold">Rate Limiting Protection:</span>
              <p>Each team is allotted a <strong>15-second cooldown</strong> between payload submissions, capped at <strong>6 requests per minute (RPM)</strong>. Flooding or automated brute-forcing will trigger HTTP 429 warnings.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

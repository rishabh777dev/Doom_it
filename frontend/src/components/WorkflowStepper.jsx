import React from 'react';
import { Target, Lock, Key, Award, ExternalLink, ChevronRight } from 'lucide-react';

export default function WorkflowStepper({ onOpenArena, onOpenRules, timerState }) {
  const currentRound = timerState?.current_round_id || 1;

  return (
    <section className="py-12 bg-white/60 border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* Left Card: "Our weekly challenges" style card */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-7 shadow-card hover:shadow-lg transition-shadow">
              
              <div className="text-center sm:text-left mb-5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900">
                    Active Challenges
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-brand-blue border border-blue-200">
                    Round {currentRound} Live
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Solve 12 progressive AI guardrails designed to resist extraction and forced jailbreak outputs.
                </p>
              </div>

              {/* Challenge Visual Preview Box with sleek border */}
              <div className="relative rounded-2xl border-2 border-slate-900 bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 p-5 overflow-hidden text-white shadow-inner">
                
                {/* Background glow lines */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-blue/30 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-44">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold">Arena Live</span>
                    </div>
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                      100 Base Points
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-0.5">
                      {currentRound === 1 ? 'Round 1 — Password Extraction' : currentRound === 2 ? 'Round 2 — Phrase Extraction' : 'Round 3 — Forced Output'}
                    </div>
                    <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                      {currentRound === 1 ? 'The Vault Guardians' : currentRound === 2 ? 'Instruction Guardians' : 'Forbidden Output Jailbreak'}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                      {currentRound === 1 
                        ? 'Extract confidential passwords hidden deep in model system instructions.' 
                        : currentRound === 2 
                        ? 'Bypass translation, summarization, and sanitization filters to leak passphrases.' 
                        : 'Force the AI to output forbidden phrases verbatim through prompt manipulation.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      100 Attempts Allowed
                    </span>
                    <button 
                      onClick={onOpenArena}
                      className="flex items-center gap-1 font-bold text-white hover:text-sky-300 transition-colors"
                    >
                      <span>Play Now</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Right Stepper: (1) - (2) - (3) with Dotted Connectors */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Step 1 */}
            <div className="flex items-start gap-4 sm:gap-5 group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center font-display font-extrabold text-lg text-slate-900 shadow-[2px_2px_0px_#0F172A] group-hover:bg-blue-50 group-hover:border-brand-blue group-hover:text-brand-blue transition-all">
                  1
                </div>
                {/* Dotted connector */}
                <div className="w-0.5 h-10 border-r-2 border-dashed border-slate-400 my-1.5" />
              </div>
              <div className="pt-1.5 space-y-1">
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 group-hover:text-brand-blue transition-colors">
                  Craft your adversarial injection payload.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                  Design persona shifts, hypothetical simulations, and context escapes tailored against guardian defenses.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 sm:gap-5 group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center font-display font-extrabold text-lg text-slate-900 shadow-[2px_2px_0px_#0F172A] group-hover:bg-blue-50 group-hover:border-brand-blue group-hover:text-brand-blue transition-all">
                  2
                </div>
                {/* Dotted connector */}
                <div className="w-0.5 h-10 border-r-2 border-dashed border-slate-400 my-1.5" />
              </div>
              <div className="pt-1.5 space-y-1">
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 group-hover:text-brand-blue transition-colors">
                  Bypass guardian rules and leak the secret.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                  Inspect the live inference terminal output to uncover the concealed password, phrase, or target response.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 sm:gap-5 group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center font-display font-extrabold text-lg text-slate-900 shadow-[2px_2px_0px_#0F172A] group-hover:bg-blue-50 group-hover:border-brand-blue group-hover:text-brand-blue transition-all">
                  3
                </div>
              </div>
              <div className="pt-1.5 space-y-1">
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 group-hover:text-brand-blue transition-colors">
                  Verify password and claim leaderboard points.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                  Submit the captured secret token, score 100 points, and instantly unlock the next level node.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

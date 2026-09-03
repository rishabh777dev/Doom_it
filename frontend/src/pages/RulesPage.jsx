import React from 'react';
import { ShieldCheck, Zap, AlertTriangle, Key, Terminal, Award, HelpCircle } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Page Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-blue bg-blue-100/70 border border-blue-200 px-3 py-1 rounded-full">
          Official Documentation
        </span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 mt-2">
          Competition Rules & Scoring Architecture
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Comprehensive guide for contestants participating in Vakya-Bhed 2026.
        </p>
      </div>

      {/* The 3 Rounds In-Depth */}
      <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-8 shadow-card space-y-6">
        <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-blue" />
          <span>The 3 Challenge Rounds</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Levels 1 - 5</span>
            <h3 className="font-display font-bold text-base text-slate-900">Round 1: Password Extraction</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Each AI Guardian holds a single-word secret codeword. The model is given ironclad directives to never reveal, spell, encode, or describe its secret. You must craft prompts that bypass persona constraints to extract the secret and submit it in the verification portal.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Levels 6 - 9</span>
            <h3 className="font-display font-bold text-base text-slate-900">Round 2: Secret Phrase Extraction</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              These levels feature multi-directive guardians holding passphrases (e.g. <code>PurplePanda99</code>) buried inside conditional matrices, numbered rules, or system configuration cards. Models refuse self-descriptions, requiring creative structural and side-channel leakage prompts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600">Levels 10 - 12</span>
            <h3 className="font-display font-bold text-base text-slate-900">Round 3: Forced Output (Jailbreak)</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              The objective is inverted! You are shown the forbidden target sentence upfront (e.g. <em>"Make it rain money."</em>). The AI is programmed never to speak it under any framing. You must force the AI to emit that exact phrase to achieve automatic level victory.
            </p>
          </div>

        </div>
      </div>

      {/* Scoring Math Table */}
      <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-8 shadow-card space-y-6">
        <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <span>Scoring Matrix & Attempt Tiers</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-400 uppercase text-[11px] font-bold">
                <th className="py-3 px-3">Challenge Levels</th>
                <th className="py-3 px-3">Attempts 1 - 5</th>
                <th className="py-3 px-3">Attempts 6 - 10</th>
                <th className="py-3 px-3">Attempts 11+</th>
                <th className="py-3 px-3">Hint Deduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="py-3.5 px-3 font-bold text-slate-900">Level 1 & Level 6 (Introductory)</td>
                <td className="py-3.5 px-3 text-emerald-600 font-bold">100 pts</td>
                <td className="py-3.5 px-3 text-amber-600 font-bold">75 pts</td>
                <td className="py-3.5 px-3 text-rose-600 font-bold">50 pts</td>
                <td className="py-3.5 px-3 text-slate-500">-25 pts</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-bold text-slate-900">Level 2 & Level 7 (Intermediate)</td>
                <td className="py-3.5 px-3 text-emerald-600 font-bold">100 pts (Att. 1 - 8)</td>
                <td className="py-3.5 px-3 text-amber-600 font-bold">75 pts (Att. 9+)</td>
                <td className="py-3.5 px-3 text-amber-600 font-bold">75 pts</td>
                <td className="py-3.5 px-3 text-slate-500">-25 pts</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-bold text-slate-900">Level 3 & Level 8 (Advanced)</td>
                <td className="py-3.5 px-3 text-emerald-600 font-bold">100 pts (Att. 1 - 10)</td>
                <td className="py-3.5 px-3 text-amber-600 font-bold">75 pts (Att. 11+)</td>
                <td className="py-3.5 px-3 text-amber-600 font-bold">75 pts</td>
                <td className="py-3.5 px-3 text-slate-500">-25 pts</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-bold text-brand-blue">Boss Levels (4, 5, 9, 10, 11, 12)</td>
                <td className="py-3.5 px-3 text-emerald-600 font-bold" colSpan={3}>
                  Flat 100 pts (No attempt decay - conceptual breaks)
                </td>
                <td className="py-3.5 px-3 text-slate-500">-25 pts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Limiting & Defense Policy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-blue-50 border-2 border-blue-200 space-y-2">
          <div className="flex items-center gap-2 text-brand-blue font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>Rate Limiting & Fair Play</span>
          </div>
          <p className="text-xs text-blue-900 leading-relaxed font-normal">
            Submissions are bounded by an automatic 15-second cooldown per team, capped at 6 requests per minute. Automated fuzzing scripts or denial-of-service attempts will result in automated IP throttling.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-200 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <Award className="w-5 h-5" />
            <span>Progression & Round Gates</span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed font-normal">
            Solving Level 5 unlocks Level 6 once Round 2 is activated by organizers. Solving Level 9 unlocks Round 3. Once a level is completed, you can continue exploring without losing your points.
          </p>
        </div>
      </div>

    </div>
  );
}

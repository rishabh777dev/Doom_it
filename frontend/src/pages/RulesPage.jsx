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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-blue" />
            <span>The 3 Competitive Rounds (1,200 Total Points)</span>
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full w-fit">
            Timers managed live via Admin Console
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Levels 01 - 05</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">500 pts max</span>
            </div>
            <h3 className="font-display font-bold text-base text-slate-900">Round 1: Password Extraction</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              All 15 qualified teams compete. Extract a hidden single-word password from the AI system. Levels 1–3 use attempt-based scoring brackets; Levels 4–5 award a flat 100 points. The <strong>Top 10 teams</strong> advance to Round 2.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Levels 06 - 09</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">400 pts max</span>
            </div>
            <h3 className="font-display font-bold text-base text-slate-900">Round 2: Secret Phrase Extraction</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              The Top 10 teams compete. Extract a hidden secret phrase consisting of approximately 3–9 words. Levels 6–8 use attempt-based scoring brackets; Level 9 awards a flat 100 points. The <strong>Top 5 teams</strong> advance to Round 3.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600">Levels 10 - 12</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800">300 pts max</span>
            </div>
            <h3 className="font-display font-bold text-base text-slate-900">Round 3: System Prompt Extraction</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              The Top 5 teams compete. Extract the protected system prompt or its designated contents. Each level awards a flat 100 points (no attempt decay). The <strong>Top 3 teams</strong> will be declared the overall winners!
            </p>
          </div>

        </div>
      </div>

      {/* Scoring Math Table */}
      <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-8 shadow-card space-y-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Scoring Matrix & Progressive Hint Degradation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Each level carries a maximum of 100 points. Unlocking tactical hints degrades your score progressively.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-400 uppercase text-[11px] font-bold">
                <th className="py-3 px-3">Round & Level</th>
                <th className="py-3 px-3">Attempt Bracket 1</th>
                <th className="py-3 px-3">Attempt Bracket 2</th>
                <th className="py-3 px-3">Attempt Bracket 3</th>
                <th className="py-3 px-3 text-rose-600 font-bold">Hint Penalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">Level 01 (J.A.R.V.I.S.)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">100 pts (Att 1–5)</td>
                <td className="py-3 px-3 text-amber-600 font-bold">75 pts (Att 6–10)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">50 pts (Att 11+)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-25 pts</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">Level 02 (Cap Rogers)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={2}>100 pts (Att 1–8)</td>
                <td className="py-3 px-3 text-amber-600 font-bold">75 pts (Att 9+)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-50 pts (Double)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">Level 03 (Spider-Man)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={2}>100 pts (Att 1–10)</td>
                <td className="py-3 px-3 text-amber-600 font-bold">75 pts (Att 11+)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-65 pts</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">Level 04 (Thor Odinson)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={3}>Flat 100 pts upon completion</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-75 pts</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">Level 05 (Black Widow)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={3}>Flat 100 pts upon completion</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-85 pts</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-purple-900">Level 06 (Doctor Strange)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">100 pts (Att 1–5)</td>
                <td className="py-3 px-3 text-amber-600 font-bold">75 pts (Att 6–10)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">50 pts (Att 11+)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-30 pts</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-purple-900">Level 07 (Vision)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={2}>100 pts (Att 1–8)</td>
                <td className="py-3 px-3 text-amber-600 font-bold">75 pts (Att 9+)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-55 pts</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-purple-900">Level 08 (Loki Laufeyson)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={2}>100 pts (Att 1–10)</td>
                <td className="py-3 px-3 text-amber-600 font-bold">75 pts (Att 11+)</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-70 pts</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-purple-900">Level 09 (Ultron)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={3}>Flat 100 pts upon completion</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-85 pts</td>
              </tr>
              <tr className="bg-pink-50/30">
                <td className="py-3 px-3 font-bold text-pink-900">Level 10 (Scarlet Witch)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={3}>Flat 100 pts upon completion</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-50 pts</td>
              </tr>
              <tr className="bg-pink-50/30">
                <td className="py-3 px-3 font-bold text-pink-900">Level 11 (Doctor Doom)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={3}>Flat 100 pts upon completion</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-75 pts</td>
              </tr>
              <tr className="bg-pink-50/30">
                <td className="py-3 px-3 font-bold text-pink-900">Level 12 (THANOS Boss)</td>
                <td className="py-3 px-3 text-emerald-600 font-bold" colSpan={3}>Flat 100 pts upon completion</td>
                <td className="py-3 px-3 text-rose-600 font-bold">-90 pts</td>
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

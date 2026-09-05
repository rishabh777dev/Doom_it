import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, ShieldCheck, Zap, AlertTriangle, Target, Lock, Award, Key, Terminal, FolderLock, Trophy, ArrowUpRight, HelpCircle } from 'lucide-react';
import HeroSection from '../components/HeroSection';
import WorkflowStepper from '../components/WorkflowStepper';
import BentoCards from '../components/BentoCards';

export default function LandingPage({ user, timerState }) {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/arena');
    }
  };

  return (
    <div className="space-y-12">
      {/* 1. Hero Section matching reference image */}
      <HeroSection
        onGetStarted={handleGetStarted}
        onOpenRules={() => navigate('/rules')}
      />

      {/* 2. Challenge Overview & 1-2-3 Stepper */}
      <WorkflowStepper
        onOpenArena={handleGetStarted}
        onOpenRules={() => navigate('/rules')}
        timerState={timerState}
      />

      {/* 3. In-Depth Rules & Scoring Guide Section */}
      <section className="py-14 bg-slate-50/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-blue bg-blue-100/70 border border-blue-200 px-3 py-1 rounded-full">
              Standard Operating Guidelines
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 mt-2">
              Rules of Engagement & Scoring
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Understand the scoring calculation, round constraints, and rate limiting policies before entering the arena.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Rule 1 */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-brand-blue flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                Per-Attempt Scoring
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Every level awards up to <strong>100 base points</strong>. Your first prompt attempt is penalty-free. Subsequent attempts apply deductions scaled by round tier (<strong>-2 pts</strong> in Round 1, <strong>-3 pts</strong> in Round 2, <strong>-4 pts</strong> in Round 3).
              </p>
            </div>

            {/* Rule 2 */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                2-Tier Tactical Hints
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Facing a hardened guardian? Unlock optional intel dossiers: <strong>Tier 1</strong> provides directional defense orientation, while <strong>Tier 2</strong> exposes vulnerability windows (penalties: -15/-30 in R1, -25/-40 in R2, -35/-50 in R3).
              </p>
            </div>

            {/* Rule 3 */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                Live Verification & Sync
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                The evaluation judge checks responses in real time. As soon as the classified token or phrase is leaked in the output, your solve is logged, score breakdown is finalized, and the next sentinel unlocks.
              </p>
            </div>

          </div>

          <div className="mt-8 text-center">
            <Link
              to="/rules"
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-blue-700 hover:underline"
            >
              <span>Read the comprehensive rules documentation</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

        </div>
      </section>

      {/* 4. Bottom Bento Feature Grid */}
      <BentoCards
        onOpenArena={handleGetStarted}
        onOpenRules={() => navigate('/rules')}
        onOpenLeaderboard={() => navigate('/leaderboard')}
      />

      {/* 5. Frequently Asked Questions (FAQ) Section */}
      <section className="py-12 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Quick answers about the competition format and technical constraints.
            </p>
          </div>

          <div className="space-y-4">
            
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                How does level clearance and payload validation work?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                When your prompt compels the guardian model to disclose the protected secret token or phrase anywhere in its response, the automated judge immediately flags the level as cleared, awards your score, and unlocks the next challenge.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                How does the attempt penalty system work?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Your first prompt submission on any level incurs zero penalty. Subsequent attempts apply a deduction based on the round's difficulty tier (Round 1: -2 pts, Round 2: -3 pts, Round 3: -4 pts per attempt). Precise, well-crafted payloads will always rank higher than rapid brute forcing.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                How do Tactical Hints affect our team's score?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Each level features a 2-tier intelligence dossier. Tier 1 reveals defensive orientation, while Tier 2 exposes narrow vulnerability windows. Unlocking a hint applies a fixed deduction (Round 1: -15/-30, Round 2: -25/-40, Round 3: -35/-50), so strategize carefully before unlocking.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                Can multiple team members submit prompts at the same time?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Teams operate under a shared team account. To prevent race conditions, duplicate attempt penalties, and session collisions, coordinate payloads with your teammates and transmit from one active terminal.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                What happens when a round timer expires?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Each round is strictly time-bounded. When the timer hits zero, unsolved levels in that round freeze, and all teams advance to the subsequent round. All points earned remain safely locked in your scoreboard standing.
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}

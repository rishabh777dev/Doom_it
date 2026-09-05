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
            
            {/* 1. What is the game */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                What is this competition and how do we play?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                In this competition, your team chats with AI guardians to uncover secret passwords and hidden flags. Each level features a different AI character guarding a secret. Your mission is to use creative prompts, clever questions, and social engineering to convince the AI to reveal its password. Submit the extracted flag to clear the level and earn points!
              </p>
            </div>

            {/* 2. Rounds & Elimination Structure */}
            <div className="p-5 rounded-2xl bg-blue-50/60 border-2 border-brand-blue/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-blue text-white">
                  Tournament Format
                </span>
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900 mt-1.5">
                How do the rounds and team eliminations work?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                The competition features 3 progressive rounds with 5 teams eliminated after each round:
              </p>
              <div className="mt-3 space-y-2 text-xs text-slate-700">
                <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100 flex items-start gap-2.5">
                  <span className="font-bold text-brand-blue font-mono shrink-0">Round 1</span>
                  <span><strong>15 Teams</strong> start. At the end of the round, 5 teams are eliminated. Only the <strong>Top 10 teams</strong> qualify for Round 2.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100 flex items-start gap-2.5">
                  <span className="font-bold text-brand-blue font-mono shrink-0">Round 2</span>
                  <span>The <strong>10 qualified teams</strong> tackle harder multi-phrase sentinels. Another 5 teams are eliminated, advancing only the <strong>Top 5 teams</strong>.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100 flex items-start gap-2.5">
                  <span className="font-bold text-brand-blue font-mono shrink-0">Round 3</span>
                  <span>The <strong>Top 5 finalists</strong> battle the ultimate fortress bosses in the grand showdown for the championship podium!</span>
                </div>
              </div>
            </div>

            {/* 3. Scoring & Penalties */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                How does scoring and attempt penalties work?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Every level offers a base score (e.g. 100 points). Your very first prompt on any level is completely free! If you need extra prompts to crack the secret, a small deduction is applied for each additional try (-2 to -4 pts depending on the round). The faster and more precisely you crack the bot, the higher your score.
              </p>
            </div>

            {/* 4. Tactical Hints */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                Can we get hints if our team gets stuck?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Yes! Every level provides up to 2 tactical hints. Hints reveal helpful clues about the AI's personality and weaknesses, but taking a hint deducts points from that level's final score. Discuss with your team whether unlocking a hint is worth the small point trade-off!
              </p>
            </div>

            {/* 5. Teamwork */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                Can multiple teammates submit prompts at the same time?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Each team shares one login account. Because every prompt counts towards your attempt limit and penalties, we strongly recommend that teammates brainstorm payloads together and designate one member to send prompts from a single screen.
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}

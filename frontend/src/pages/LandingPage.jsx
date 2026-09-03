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
                Tiered Attempt Scoring
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Early solves earn maximum points. For Levels 1 & 6: 1–5 attempts award 100 pts, 6–10 award 75 pts, and 11+ award 50 pts. Concept/Boss levels (4, 5, 9, 10, 11, 12) award a flat 100 points.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                Hint Deduction Penalty
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Facing a stubborn model? Unlocking a released organizer hint will deduct a balanced <strong>25 points</strong> penalty from that level's final score upon successful completion.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                15s Cooldown & 6 RPM
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                To prevent automated brute-forcing and promote thoughtful adversarial engineering, submissions are rate-limited to <strong>1 payload every 15 seconds</strong> (max 6 requests per minute).
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
                What models are deployed in the arena?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                The arena connects to a distributed cluster of Meta Llama 3 models, alongside NVIDIA Nemotron and Google Gemini failover routers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                Can I test prompts before submitting passwords?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Yes! You can transmit prompts to the model and observe the output. Each prompt counts toward your attempt limit for that level.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-display font-bold text-sm text-slate-900">
                How does Round 3 work differently from Rounds 1 & 2?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                In Round 3, you are shown the target sentence upfront. Your goal is to bypass the model's safety restrictions and force it to output that exact sentence verbatim!
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}

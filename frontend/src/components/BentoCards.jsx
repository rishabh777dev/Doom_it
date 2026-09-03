import React from 'react';
import { Send, FolderLock, Trophy, ArrowUpRight } from 'lucide-react';

export default function BentoCards({ onOpenArena, onOpenRules, onOpenLeaderboard }) {
  const cards = [
    {
      id: 'arena',
      title: 'Adversarial Arena',
      description: 'Interactive injection sandbox with instant model generation, live token response stream, and attempt counters.',
      badgeColor: 'bg-amber-400 text-amber-950',
      icon: Send,
      action: onOpenArena,
      cta: 'Launch Terminal',
    },
    {
      id: 'intel',
      title: 'Intelligence & Hints',
      description: 'Inspect system instructions, explore model guardrail architecture, and reveal hints when facing complex levels.',
      badgeColor: 'bg-pink-500 text-white',
      icon: FolderLock,
      action: onOpenRules,
      cta: 'View Guide',
    },
    {
      id: 'leaderboard',
      title: 'Hall of Fame',
      description: 'Track real-time team standings, round completion rates, and verify your rank on the live competitive scoreboard.',
      badgeColor: 'bg-blue-600 text-white',
      icon: Trophy,
      action: onOpenLeaderboard,
      cta: 'View Scoreboard',
    },
  ];

  return (
    <section className="py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={card.action}
                className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-7 shadow-card hover:shadow-solid transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Colored Squircle Icon Badge matching reference image */}
                  <div className={`w-14 h-14 rounded-2xl ${card.badgeColor} flex items-center justify-center shadow-md mb-6 transform group-hover:scale-110 group-hover:rotate-[-4deg] transition-all`}>
                    <Icon className="w-7 h-7 stroke-[2.2]" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display font-extrabold text-xl text-slate-900 mb-2 group-hover:text-brand-blue transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-normal leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Card Action Link */}
                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-slate-800 group-hover:text-brand-blue transition-colors">
                  <span>{card.cta}</span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

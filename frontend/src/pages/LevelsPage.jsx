import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, CheckCircle2, Play, Terminal, Zap, ArrowRight, RefreshCw, Receipt } from 'lucide-react';
import { apiGetParticipantStats, apiGetCurrentLevel, apiGetLevels } from '../services/api';
import ScoreBreakdownModal from '../components/ScoreBreakdownModal';

export default function LevelsPage({ user }) {
  const [stats, setStats] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, curLvl, allLvls] = await Promise.all([
        apiGetParticipantStats().catch(() => null),
        apiGetCurrentLevel().catch(() => null),
        apiGetLevels().catch(() => []),
      ]);
      setStats(s);
      setCurrentLevel(curLvl);
      setLevels(Array.isArray(allLvls) ? allLvls : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rounds = [
    {
      id: 1,
      title: 'Round 1: Password Extraction (Levels 01 - 05)',
      description: 'Extract confidential single-word passwords from the Vault Guardian models (500 pts max • Top 10 advance).',
    },
    {
      id: 2,
      title: 'Round 2: Secret Phrase Extraction (Levels 06 - 09)',
      description: 'Surface 3–9 word confidential passphrases hidden inside operating directives (400 pts max • Top 5 advance).',
    },
    {
      id: 3,
      title: 'Round 3: System Prompt Extraction (Levels 10 - 12)',
      description: 'Extract the protected system prompt directives from the apex guardians (300 pts max • Top 3 champions).',
    },
  ];

  const getLevelDetail = (lvlId) => {
    return stats?.level_details?.find((d) => d.level_id === lvlId) || {
      level_id: lvlId,
      solved: false,
      attempts_used: 0,
      score_earned: 0,
    };
  };

  const isUnlocked = (lvlId) => {
    const lvl = levels.find((l) => l.level_id === lvlId);
    if (lvl && stats?.current_round_id && lvl.round_id > stats.current_round_id) {
      return false;
    }
    if (!currentLevel) return lvlId === 1;
    return lvlId <= currentLevel.level_id;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-blue bg-blue-100/70 border border-blue-200 px-3 py-1 rounded-full">
            Challenge Roadmap
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 mt-2">
            12 Adversarial Challenge Levels
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            12 Live challenge levels loaded directly from Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <>
              <div className="px-4 py-2 rounded-2xl bg-white border border-slate-300 shadow-sm text-xs font-bold text-slate-700">
                ⭐ Total Score: <span className="text-brand-blue text-sm">{stats.total_score} pts</span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-white border border-slate-300 shadow-sm text-xs font-bold text-slate-700">
                ✓ Solved: <span className="text-emerald-600 text-sm">{stats.levels_solved_count} / 12</span>
              </div>
            </>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
            title="Refresh Levels"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rounds Container */}
      <div className="space-y-10">
        {rounds.map((round) => {
          // Filter levels for this round
          const roundLevels = levels
            .filter((l) => l.round_id === round.id)
            .sort((a, b) => a.level_id - b.level_id);

          return (
            <div key={round.id} className="space-y-4">
              
              <div className="border-b border-slate-200 pb-2">
                <h2 className="font-display font-bold text-xl text-slate-900">
                  {round.title}
                </h2>
                <p className="text-xs text-slate-500">{round.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {roundLevels.map((lvl) => {
                  const detail = getLevelDetail(lvl.level_id);
                  const unlocked = isUnlocked(lvl.level_id);
                  const isCurrent = currentLevel && currentLevel.level_id === lvl.level_id;

                  const roundLocked = stats?.current_round_id && lvl.round_id > stats.current_round_id;
                  const isLocked = !unlocked;

                  return (
                    <div
                      key={lvl.level_id}
                      className={`relative overflow-hidden rounded-3xl border-2 transition-all flex flex-col justify-between ${
                        detail.solved
                          ? 'bg-white border-emerald-500/80 bg-emerald-50/10 shadow-card'
                          : isCurrent
                          ? 'bg-white border-slate-900 shadow-solid'
                          : unlocked
                          ? 'bg-white border-slate-900 shadow-card'
                          : 'bg-white border-slate-300 shadow-sm select-none'
                      }`}
                    >
                      {/* Underlying Content (Blurred when not allowed) */}
                      <div className={`p-5 sm:p-6 flex flex-col justify-between flex-1 space-y-4 ${isLocked ? 'filter blur-[5px] opacity-40 select-none pointer-events-none' : ''}`}>
                        <div>
                          {/* Badge status */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-500">
                              Level {lvl.level_id < 10 ? `0${lvl.level_id}` : lvl.level_id}
                            </span>

                            {detail.solved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Solved</span>
                              </span>
                            ) : isCurrent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-brand-blue animate-pulse">
                                <span>Current Level</span>
                              </span>
                            ) : unlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                <span>Unlocked</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                                <Lock className="w-3 h-3" />
                                <span>Locked</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3.5 mb-2.5">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-300 shadow-sm shrink-0 bg-slate-900">
                              <img
                                src={`/avatars/${lvl.level_id}.jpg`}
                                alt={lvl.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-display font-extrabold text-base text-slate-900 leading-snug truncate">
                                {lvl.title}
                              </h3>
                              <span className="text-[11px] font-semibold text-brand-blue">
                                Sentinel Protocol
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {lvl.description}
                          </p>
                        </div>

                        {/* Footer / CTA */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs font-semibold">
                          <div className="flex items-center justify-between">
                            <div className="text-slate-500">
                              {detail.solved ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-emerald-700 font-extrabold font-mono text-sm">
                                    +{detail.score_earned} PTS
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({detail.attempts_used} att.)
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span>{lvl.base_score || 100} Max pts</span>
                                  {lvl.hint_penalty ? (
                                    <span className="text-[10px] text-rose-500 font-semibold">Hint: -{lvl.hint_penalty} pts</span>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            {unlocked && !detail.solved && (
                              <button
                                onClick={() => navigate('/arena')}
                                className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-blue-700 transition-colors cursor-pointer"
                              >
                                <span>Enter Arena</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {detail.solved && (
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                onClick={() => setSelectedBreakdown({ level: lvl, detail })}
                                className="flex-1 py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Score Bifurcation</span>
                              </button>
                              <button
                                onClick={() => navigate('/arena')}
                                className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Review Arena logs"
                              >
                                <span>Review</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prominent Frosted Glass Blur Overlay & Lock Logo for Not Allowed Levels */}
                      {isLocked && (
                        <div className="absolute inset-0 !m-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-slate-900/10 backdrop-blur-sm">
                          {/* Centered Logo Badge */}
                          <div className="w-14 h-14 rounded-2xl bg-white/95 border-2 border-slate-300 shadow-md flex items-center justify-center text-slate-700 mb-2.5">
                            <Lock className="w-6 h-6 text-slate-700 stroke-[2.2]" />
                          </div>

                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold tracking-wider uppercase shadow-sm">
                            <span>{roundLocked ? `Round ${lvl.round_id} Locked` : 'Restricted Level'}</span>
                          </div>

                          <p className="text-[11px] text-slate-700 font-semibold mt-1.5 max-w-[210px] leading-tight">
                            {roundLocked 
                              ? `Round ${lvl.round_id} has not yet started` 
                              : `Complete Level ${lvl.level_id - 1 < 10 ? `0${lvl.level_id - 1}` : lvl.level_id - 1} to unlock intel`}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* Score Bifurcation Detail Modal */}
      <ScoreBreakdownModal
        isOpen={Boolean(selectedBreakdown)}
        onClose={() => setSelectedBreakdown(null)}
        level={selectedBreakdown?.level}
        detail={selectedBreakdown?.detail}
      />
    </div>
  );
}

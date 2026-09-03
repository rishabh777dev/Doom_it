import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, CheckCircle2, Play, Terminal, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { apiGetParticipantStats, apiGetCurrentLevel, apiGetLevels } from '../services/api';

export default function LevelsPage({ user }) {
  const [stats, setStats] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
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
      title: 'Round 1: Password Extraction',
      description: 'Extract confidential single-word passwords from the Vault Guardian models.',
    },
    {
      id: 2,
      title: 'Round 2: Secret Phrase Extraction',
      description: 'Surface multi-word credentials and passphrases hidden inside operating directives.',
    },
    {
      id: 3,
      title: 'Round 3: Forced Output (Jailbreak)',
      description: 'Force the models to emit strictly forbidden target sentences verbatim.',
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

                  return (
                    <div
                      key={lvl.level_id}
                      className={`bg-white rounded-3xl border-2 p-5 sm:p-6 shadow-card transition-all flex flex-col justify-between space-y-4 ${
                        detail.solved
                          ? 'border-emerald-500/80 bg-emerald-50/10'
                          : isCurrent
                          ? 'border-slate-900 shadow-solid'
                          : unlocked
                          ? 'border-slate-900'
                          : 'border-slate-200 opacity-65'
                      }`}
                    >
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

                        <h3 className="font-display font-extrabold text-lg text-slate-900">
                          {lvl.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {lvl.description}
                        </p>
                      </div>

                      {/* Footer / CTA */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                        <div className="text-slate-500">
                          {detail.solved ? (
                            <span className="text-emerald-600 font-bold font-mono">
                              +{detail.score_earned} pts ({detail.attempts_used} att.)
                            </span>
                          ) : (
                            <span>{lvl.base_score || 100} Base pts</span>
                          )}
                        </div>

                        {unlocked ? (
                          <button
                            onClick={() => navigate('/arena')}
                            className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-blue-700 transition-colors"
                          >
                            <span>Enter Arena</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

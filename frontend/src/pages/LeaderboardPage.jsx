import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, Search, Medal, Shield, Sparkles, TrendingUp, Crown, Award } from 'lucide-react';
import { apiGetLeaderboard } from '../services/api';
import { useScoreboardRankAnimation, useCountUp } from '../utils/animations';

function PodiumScore({ score, isClimbing }) {
  const animatedScore = useCountUp(score, 700);
  return (
    <span className={`font-mono font-extrabold text-2xl text-emerald-600 transition-transform duration-300 ${isClimbing ? 'scale-110 text-emerald-500' : ''}`}>
      {animatedScore} <span className="text-xs text-slate-400 font-normal">pts</span>
    </span>
  );
}

function ScoreCell({ score, scoreDelta, isClimbing }) {
  const animatedScore = useCountUp(score, 700);
  return (
    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 text-base">
      <div className="flex items-center justify-end gap-1.5">
        {scoreDelta > 0 && (
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
            +{scoreDelta}
          </span>
        )}
        <span className={isClimbing ? 'inline-block scale-110 text-emerald-500 transition-transform duration-300' : ''}>
          {animatedScore} <span className="text-xs text-slate-400 font-normal">pts</span>
        </span>
      </div>
    </td>
  );
}

function OlympicPodiumStep({ team, rank, anim, orderClass, animationDelay }) {
  if (!team) return null;

  const isClimbing = Boolean(anim?.isClimbing || anim?.hasScored);

  const configs = {
    1: {
      label: 'Olympic Gold',
      placeText: '1st Place • Champion',
      cardBorder: 'border-2 border-amber-400',
      cardBg: 'bg-gradient-to-b from-amber-500/15 via-amber-100/30 to-white',
      badgeBg: 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-400/40',
      pedestalBg: 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-amber-950 border-amber-500',
      pedestalHeight: 'h-24 sm:h-28',
      numeral: '1',
      medalGlow: 'shadow-amber-400/40',
      medalIcon: <Medal className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 animate-medal-sway" />,
      cardGlow: 'animate-champion-glow ring-2 ring-amber-300/70',
      accentColor: 'text-amber-600',
    },
    2: {
      label: 'Olympic Silver',
      placeText: '2nd Place • Runner-Up',
      cardBorder: 'border-2 border-slate-300',
      cardBg: 'bg-gradient-to-b from-slate-100/90 via-slate-50 to-white',
      badgeBg: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900',
      pedestalBg: 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-800 border-slate-300',
      pedestalHeight: 'h-16 sm:h-20',
      numeral: '2',
      medalGlow: 'shadow-slate-300/40',
      medalIcon: <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 animate-medal-sway" style={{ animationDelay: '0.8s' }} />,
      cardGlow: 'hover:border-slate-400',
      accentColor: 'text-slate-600',
    },
    3: {
      label: 'Olympic Bronze',
      placeText: '3rd Place',
      cardBorder: 'border-2 border-amber-700/30',
      cardBg: 'bg-gradient-to-b from-amber-900/10 via-amber-800/5 to-white',
      badgeBg: 'bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100',
      pedestalBg: 'bg-gradient-to-b from-amber-600/80 via-amber-700 to-amber-800 text-amber-100 border-amber-700',
      pedestalHeight: 'h-12 sm:h-14',
      numeral: '3',
      medalGlow: 'shadow-amber-700/40',
      medalIcon: <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 animate-medal-sway" style={{ animationDelay: '1.6s' }} />,
      cardGlow: 'hover:border-amber-700/50',
      accentColor: 'text-amber-800',
    },
  };

  const config = configs[rank];

  return (
    <div
      className={`flex flex-col justify-end w-full animate-olympic-rise ${orderClass}`}
      style={{ animationDelay }}
    >
      {/* Top Suspended Card */}
      <div
        className={`relative p-5 sm:p-6 rounded-3xl ${config.cardBorder} ${config.cardBg} shadow-card flex flex-col justify-between space-y-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${config.cardGlow} ${
          isClimbing ? 'ring-2 ring-emerald-400 shadow-emerald-400/20 scale-[1.02]' : ''
        }`}
      >
        {/* Crown Badge on 1st Place */}
        {rank === 1 && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-md border border-amber-300 whitespace-nowrap">
            <Crown className="w-3.5 h-3.5 text-amber-100 fill-amber-100 animate-bounce" />
            <span>Grand Champion</span>
          </div>
        )}

        {/* Ceremonial Ribbons / Medallion Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center shrink-0 ${config.medalGlow}`}>
              {config.medalIcon}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block text-slate-400 leading-none">
                {config.label}
              </span>
              <span className={`text-xs font-bold ${config.accentColor} leading-tight`}>
                {config.placeText}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {anim?.rankDelta > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black animate-bounce shadow-sm">
                ▲ +{anim.rankDelta}
              </span>
            )}
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${config.badgeBg} flex items-center justify-center font-black text-xs sm:text-sm shadow-sm`}>
              {rank}
            </div>
          </div>
        </div>

        {/* Team Details */}
        <div>
          <h3 className="font-display font-extrabold text-base sm:text-xl text-slate-900 truncate">
            {team.team_name}
          </h3>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
            <span className="font-medium">Solved {team.levels_solved}/12</span>
            <span>•</span>
            <span className="font-bold text-brand-blue">Round {team.current_round}</span>
          </div>
        </div>

        {/* Score Display */}
        <div className="pt-2.5 border-t border-slate-200/70 flex items-baseline justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
          <PodiumScore score={team.total_score} isClimbing={isClimbing} />
        </div>
      </div>

      {/* Dimensional 3D Stepped Olympic Pedestal */}
      <div
        className={`w-full ${config.pedestalHeight} ${config.pedestalBg} rounded-2xl sm:rounded-b-none sm:rounded-t-3xl mt-2 sm:mt-2.5 border-t-2 border-x-2 flex flex-col items-center justify-center shadow-lg relative overflow-hidden transition-all`}
      >
        {rank === 1 && (
          <div className="absolute top-1.5 text-amber-950/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />
            <span className="text-[9px] font-black tracking-widest uppercase">Podium I</span>
            <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />
          </div>
        )}
        <span className="font-display font-black text-3xl sm:text-4xl tracking-tight opacity-90 drop-shadow-sm mt-0.5">
          {config.numeral}
        </span>
      </div>
    </div>
  );
}

export default function LeaderboardPage({ user }) {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await apiGetLeaderboard();
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to load scoreboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredEntries = entries.filter((e) =>
    e.team_name.toLowerCase().includes(search.toLowerCase())
  );

  const topThree = entries.slice(0, 3);
  const { rowRefs, animationStates } = useScoreboardRankAnimation(filteredEntries, user);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-blue bg-blue-100/70 border border-blue-200 px-3 py-1 rounded-full">
            Real-Time Standings
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 mt-2">
            Hall of Fame & Scoreboard
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Live rankings of competing teams across all 12 adversarial levels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Olympic Prize Ceremony Podium Section */}
      {topThree.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-display font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                Olympic Prize Ceremony Podium
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
              Top 3 Leaders
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-end pt-2 sm:pt-4">
            {/* 2nd Place - Silver (Left on Desktop) */}
            {topThree[1] && (
              <OlympicPodiumStep
                team={topThree[1]}
                rank={2}
                anim={animationStates[topThree[1].team_name]}
                orderClass="order-2 sm:order-1"
                animationDelay="180ms"
              />
            )}

            {/* 1st Place - Gold (Center on Desktop, Elevated Tallest) */}
            {topThree[0] && (
              <OlympicPodiumStep
                team={topThree[0]}
                rank={1}
                anim={animationStates[topThree[0].team_name]}
                orderClass="order-1 sm:order-2"
                animationDelay="360ms"
              />
            )}

            {/* 3rd Place - Bronze (Right on Desktop) */}
            {topThree[2] && (
              <OlympicPodiumStep
                team={topThree[2]}
                rank={3}
                anim={animationStates[topThree[2].team_name]}
                orderClass="order-3 sm:order-3"
                animationDelay="50ms"
              />
            )}
          </div>
        </div>
      )}

      {/* Scoreboard Table Card */}
      <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-card p-6 sm:p-8 space-y-4">
        
        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by team name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white transition-all"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No matching teams found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Team Name</th>
                  <th className="py-3 px-3 text-center">Round</th>
                  <th className="py-3 px-3 text-center">Levels Solved</th>
                  <th className="py-3 px-3 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEntries.map((entry) => {
                  const isCurrent = user?.username && entry.team_name.toLowerCase() === user.username.toLowerCase();
                  const anim = animationStates[entry.team_name];
                  const isClimbing = Boolean(anim?.isClimbing || anim?.hasScored);

                  return (
                    <tr
                      key={entry.team_name}
                      ref={(el) => {
                        if (el) rowRefs.current[entry.team_name] = el;
                        else delete rowRefs.current[entry.team_name];
                      }}
                      className={`transition-colors duration-300 relative ${
                        isClimbing
                          ? 'bg-emerald-50/90 font-bold shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400'
                          : isCurrent
                          ? 'bg-blue-50/80 font-bold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-3 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>#{entry.rank}</span>
                          {anim?.rankDelta > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-tight animate-bounce shadow-sm">
                              ▲ +{anim.rankDelta}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={isCurrent ? 'text-brand-blue' : 'text-slate-900'}>
                          {entry.team_name}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase font-bold">
                            Your Team
                          </span>
                        )}
                        {isClimbing && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase font-black tracking-wider animate-pulse">
                            <Sparkles className="w-2.5 h-2.5" />
                            Rank Surge
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-600">
                        Round {entry.current_round}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {entry.levels_solved} / 12
                        </span>
                      </td>

                      <ScoreCell score={entry.total_score} scoreDelta={anim?.scoreDelta} isClimbing={isClimbing} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}

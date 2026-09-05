import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, RefreshCw, Search, Medal, Shield, Sparkles } from 'lucide-react';
import { apiGetLeaderboard } from '../services/api';

function PodiumScore({ score }) {
  return (
    <span className="font-mono font-extrabold text-xl sm:text-2xl text-emerald-600">
      {score} <span className="text-xs text-slate-400 font-normal">pts</span>
    </span>
  );
}

function ScoreCell({ score }) {
  return (
    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 text-base">
      {score} <span className="text-xs text-slate-400 font-normal">pts</span>
    </td>
  );
}

function PodiumStep({ team, rank, orderClass }) {
  if (!team) return null;

  const configs = {
    1: {
      label: 'Gold Tier',
      placeText: '1st Place',
      cardBorder: 'border-2 border-amber-400',
      cardBg: 'bg-gradient-to-b from-amber-500/15 via-amber-100/30 to-white',
      badgeBg: 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-400/40',
      pedestalBg: 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-amber-950 border-amber-500',
      pedestalHeight: 'h-12 sm:h-14',
      numeral: '1',
      medalGlow: 'shadow-amber-400/40',
      medalIcon: <Medal className="w-5 h-5 text-amber-500" />,
      cardGlow: 'ring-2 ring-amber-300/70 shadow-lg shadow-amber-400/20',
      accentColor: 'text-amber-600',
    },
    2: {
      label: 'Silver Tier',
      placeText: '2nd Place',
      cardBorder: 'border-2 border-slate-300',
      cardBg: 'bg-gradient-to-b from-slate-100/90 via-slate-50 to-white',
      badgeBg: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900',
      pedestalBg: 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 text-slate-800 border-slate-300',
      pedestalHeight: 'h-8 sm:h-10',
      numeral: '2',
      medalGlow: 'shadow-slate-300/40',
      medalIcon: <Medal className="w-5 h-5 text-slate-400" />,
      cardGlow: 'hover:border-slate-400 shadow-sm',
      accentColor: 'text-slate-600',
    },
    3: {
      label: 'Bronze Tier',
      placeText: '3rd Place',
      cardBorder: 'border-2 border-amber-700/30',
      cardBg: 'bg-gradient-to-b from-amber-900/10 via-amber-800/5 to-white',
      badgeBg: 'bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100',
      pedestalBg: 'bg-gradient-to-b from-amber-600/80 via-amber-700 to-amber-800 text-amber-100 border-amber-700',
      pedestalHeight: 'h-5 sm:h-7',
      numeral: '3',
      medalGlow: 'shadow-amber-700/40',
      medalIcon: <Medal className="w-5 h-5 text-amber-700" />,
      cardGlow: 'hover:border-amber-700/50 shadow-sm',
      accentColor: 'text-amber-800',
    },
  };

  const config = configs[rank];

  return (
    <div className={`flex flex-col justify-end w-full ${orderClass}`}>
      {/* Top Suspended Card */}
      <div
        className={`relative p-4 sm:p-5 rounded-3xl ${config.cardBorder} ${config.cardBg} shadow-card flex flex-col justify-between space-y-2.5 sm:space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${config.cardGlow}`}
      >
        {/* Ceremonial Ribbons / Medallion Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center shrink-0 ${config.medalGlow}`}>
              {config.medalIcon}
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider block text-slate-400 leading-none">
                {config.label}
              </span>
              <span className={`text-xs font-bold ${config.accentColor} leading-tight`}>
                {config.placeText}
              </span>
            </div>
          </div>

          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${config.badgeBg} flex items-center justify-center font-black text-xs shadow-sm`}>
            {rank}
          </div>
        </div>

        {/* Team Details */}
        <div>
          <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 truncate">
            {team.team_name}
          </h3>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
            <span className="font-medium">Solved {team.levels_solved}/12</span>
            <span>•</span>
            <span className="font-bold text-brand-blue">Round {team.current_round}</span>
          </div>
        </div>

        {/* Score Display */}
        <div className="pt-2 border-t-2 border-slate-200/90 flex items-baseline justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
          <PodiumScore score={team.total_score} />
        </div>
      </div>

      {/* Dimensional 3D Stepped Pedestal Base */}
      <div
        className={`w-full ${config.pedestalHeight} ${config.pedestalBg} rounded-2xl sm:rounded-b-none sm:rounded-t-2xl mt-1.5 sm:mt-2 border-t-2 border-x-2 flex flex-col items-center justify-center shadow-md relative overflow-hidden transition-all`}
      >
        <span className="font-display font-black text-xl sm:text-2xl tracking-tight opacity-90 drop-shadow-sm">
          {config.numeral}
        </span>
      </div>
    </div>
  );
}

export default function LeaderboardPage({ user, timerState }) {
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-12 sm:pt-4 sm:pb-16 space-y-5 sm:space-y-6">
      
      {/* Ceremony Active Grand Banner */}
      {timerState?.ceremony_active && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-500/20 border-2 border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-950 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-200/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                Official Ceremony Live
              </span>
              <h3 className="font-display font-black text-base sm:text-lg text-amber-950 mt-0.5">
                Grand Winner Ceremony is Now In Progress!
              </h3>
              <p className="text-xs text-amber-900 font-medium">
                Experience the stepped Olympic podium with dramatic sequential reveals and champion coronations.
              </p>
            </div>
          </div>

          <Link
            to="/winners"
            className="px-5 py-2.5 rounded-2xl bg-amber-950 hover:bg-black text-amber-300 font-black text-xs sm:text-sm shadow-md transition-all shrink-0 active:scale-95"
          >
            Enter Grand Ceremony 🏆
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue bg-blue-100/70 border border-blue-200 px-2.5 py-0.5 rounded-full">
            Real-Time Standings
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-slate-900 mt-1">
            Hall of Fame & Scoreboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Live rankings of competing teams across all 12 adversarial levels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 3 Standings Podium Section */}
      {topThree.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-slate-200">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="font-display font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                Top 3 Standings Podium
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
              Live Sector Leaders
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-end pt-1 sm:pt-2">
            {/* 2nd Place - Silver (Left on Desktop) */}
            {topThree[1] && (
              <PodiumStep
                team={topThree[1]}
                rank={2}
                orderClass="order-2 sm:order-1"
              />
            )}

            {/* 1st Place - Gold (Center on Desktop, Elevated Tallest) */}
            {topThree[0] && (
              <PodiumStep
                team={topThree[0]}
                rank={1}
                orderClass="order-1 sm:order-2"
              />
            )}

            {/* 3rd Place - Bronze (Right on Desktop) */}
            {topThree[2] && (
              <PodiumStep
                team={topThree[2]}
                rank={3}
                orderClass="order-3 sm:order-3"
              />
            )}
          </div>
          {/* Ground Baseline Under Pedestals */}
          <div className="hidden sm:block w-full h-1 bg-slate-200 rounded-full" />
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

                  return (
                    <tr
                      key={entry.team_name}
                      className={`transition-colors duration-200 ${
                        isCurrent
                          ? 'bg-blue-50/80 font-bold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-3 font-mono font-bold">
                        <span>#{entry.rank}</span>
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
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-600">
                        Round {entry.current_round}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {entry.levels_solved} / 12
                        </span>
                      </td>

                      <ScoreCell score={entry.total_score} />
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

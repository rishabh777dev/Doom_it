import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, Search, Medal, Shield, Sparkles } from 'lucide-react';
import { apiGetLeaderboard } from '../services/api';

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

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {topThree.map((team, idx) => {
            const colors = [
              { bg: 'bg-amber-100 text-amber-900 border-amber-300', badge: 'bg-amber-400 text-amber-950', label: '1st Place' },
              { bg: 'bg-slate-100 text-slate-800 border-slate-300', badge: 'bg-slate-300 text-slate-800', label: '2nd Place' },
              { bg: 'bg-orange-100 text-orange-900 border-orange-300', badge: 'bg-orange-400 text-orange-950', label: '3rd Place' },
            ][idx];

            return (
              <div
                key={team.team_name}
                className={`p-6 rounded-3xl border-2 ${colors.border || 'border-slate-900'} bg-white shadow-card flex flex-col justify-between space-y-4`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.bg}`}>
                    {colors.label}
                  </span>
                  <div className={`w-8 h-8 rounded-full ${colors.badge} flex items-center justify-center font-bold text-sm shadow-sm`}>
                    {idx + 1}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-extrabold text-xl text-slate-900 truncate">
                    {team.team_name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    Solved {team.levels_solved} / 12 levels (Round {team.current_round})
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Score</span>
                  <span className="font-mono font-extrabold text-2xl text-emerald-600">
                    {team.total_score} <span className="text-xs text-slate-400 font-normal">pts</span>
                  </span>
                </div>
              </div>
            );
          })}
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
                  <th className="py-3 px-3">Team Node</th>
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
                      key={entry.rank}
                      className={`transition-colors ${
                        isCurrent ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-3 font-mono font-bold">
                        #{entry.rank}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={isCurrent ? 'text-brand-blue' : 'text-slate-900'}>
                          {entry.team_name}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase font-bold">
                            Your Node
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

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 text-base">
                        {entry.total_score} <span className="text-xs text-slate-400 font-normal">pts</span>
                      </td>
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

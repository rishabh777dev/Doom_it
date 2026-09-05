import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Trophy, RefreshCw, Medal, ExternalLink } from 'lucide-react';
import { apiGetLeaderboard } from '../services/api';

export default function LeaderboardModal({ isOpen, onClose, currentUsername }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await apiGetLeaderboard();
      setEntries(data.entries || []);
      setStatus(data.status || 'live');
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
      const interval = setInterval(loadLeaderboard, 8000); // Polling every 8 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-8 my-auto overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
                Hall of Fame & Scoreboard
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Live rankings of all competing teams in VakyaBhed 2026.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/leaderboard"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
              title="Open full scoreboard in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              onClick={loadLeaderboard}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="mt-5 overflow-x-auto">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No participant teams recorded on the scoreboard yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Team Node</th>
                  <th className="py-3 px-3 text-center">Round</th>
                  <th className="py-3 px-3 text-center">Solved</th>
                  <th className="py-3 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-sm">
                {entries.map((entry) => {
                  const isCurrent = currentUsername && entry.team_name.toLowerCase() === currentUsername.toLowerCase();
                  return (
                    <tr
                      key={entry.rank}
                      className={`transition-colors ${
                        isCurrent ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className="flex items-center gap-1.5">
                          {entry.rank === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-xs font-bold shadow-sm">1</span>
                          ) : entry.rank === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center text-xs font-bold shadow-sm">2</span>
                          ) : entry.rank === 3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center text-xs font-bold shadow-sm">3</span>
                          ) : (
                            <span className="text-slate-400 pl-2">#{entry.rank}</span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={isCurrent ? 'text-brand-blue' : 'text-slate-900'}>
                          {entry.team_name}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase font-bold">
                            You
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center text-xs font-semibold text-slate-600">
                        Round {entry.current_round}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {entry.levels_solved} / 12
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 text-base">
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

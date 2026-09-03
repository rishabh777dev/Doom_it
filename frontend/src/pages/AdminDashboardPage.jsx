import React, { useState, useEffect } from 'react';
import { Settings, Play, Pause, Square, AlertOctagon, Download, Users, Plus, RefreshCw, CheckCircle2, AlertCircle, Key, Terminal, Shield, FileText } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import {
  apiUpdateCompetitionState,
  apiGetAdminParticipants,
  apiCreateParticipant,
  apiResetParticipantProgress,
  apiUnlockLevel,
  apiDeleteParticipant,
  apiGetAdminLevels,
  apiUpdateLevelSecret,
  apiGetAdminHealth,
  apiGetAdminSubmissions,
} from '../services/api';

export default function AdminDashboardPage({ timerState, onStateUpdated }) {
  const [activeTab, setActiveTab] = useState('stage'); // 'stage' | 'teams' | 'secrets' | 'logs'
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [targetRound, setTargetRound] = useState(1);
  const [participants, setParticipants] = useState([]);
  const [levels, setLevels] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [newSecret, setNewSecret] = useState('');
  const [newTargetPhrase, setNewTargetPhrase] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamUsername, setNewTeamUsername] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [health, setHealth] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timerState?.current_round_id) {
      setTargetRound(timerState.current_round_id);
    }
    loadAllData();
  }, [timerState?.current_round_id]);

  const loadAllData = async () => {
    try {
      const [parts, lvls, hlt, subs] = await Promise.all([
        apiGetAdminParticipants().catch(() => []),
        apiGetAdminLevels().catch(() => []),
        apiGetAdminHealth().catch(() => null),
        apiGetAdminSubmissions(50).catch(() => []),
      ]);
      setParticipants(parts);
      setLevels(lvls);
      setHealth(hlt);
      setSubmissions(subs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStageAction = async (status) => {
    setLoading(true);
    setMessage(null);
    try {
      await apiUpdateCompetitionState({
        status,
        duration_minutes: durationMinutes,
        current_round_id: targetRound,
      });
      setMessage({ type: 'success', text: `Competition stage set to ${status.toUpperCase()}!` });
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFreeze = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const newFreeze = !timerState?.emergency_disable_submissions;
      await apiUpdateCompetitionState({ emergency_disable_submissions: newFreeze });
      setMessage({ type: 'success', text: `Emergency submissions freeze set to: ${newFreeze}` });
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName || !newTeamUsername || !newTeamPassword) return;
    try {
      await apiCreateParticipant({
        team_name: newTeamName,
        username: newTeamUsername,
        password: newTeamPassword,
      });
      setMessage({ type: 'success', text: `Team '${newTeamName}' registered successfully!` });
      setNewTeamName('');
      setNewTeamUsername('');
      setNewTeamPassword('');
      loadAllData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleResetTeam = async (id, name) => {
    if (!window.confirm(`Reset all score and progress for team ${name}?`)) return;
    try {
      await apiResetParticipantProgress(id);
      setMessage({ type: 'success', text: `Team ${name} progress reset to Level 1!` });
      loadAllData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if (!window.confirm(`Permanently delete team ${name}?`)) return;
    try {
      await apiDeleteParticipant(id);
      setMessage({ type: 'success', text: `Team ${name} permanently deleted.` });
      loadAllData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleForceLevel = async (id, lvlId) => {
    try {
      await apiUnlockLevel(id, lvlId);
      setMessage({ type: 'success', text: `Forced Level ${lvlId} for participant.` });
      loadAllData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveSecret = async () => {
    try {
      const payload = {};
      if (newSecret.trim()) payload.secret = newSecret.trim();
      if (newTargetPhrase.trim()) payload.target_phrase = newTargetPhrase.trim();
      if (newHint.trim()) payload.hint_text = newHint.trim();

      if (Object.keys(payload).length === 0) {
        setMessage({ type: 'error', text: 'No modifications entered.' });
        return;
      }

      await apiUpdateLevelSecret(selectedLevelId, payload);
      setMessage({ type: 'success', text: `Level ${selectedLevelId} updated live! Active immediately.` });
      setNewSecret('');
      setNewTargetPhrase('');
      setNewHint('');
      loadAllData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-brand-blue selection:text-white flex flex-col justify-between">
      <div>
        <AdminNavbar timerState={timerState} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Top Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100/80 border border-purple-200 px-3 py-1 rounded-full">
                Systems Control Suite
              </span>
              <h1 className="font-display font-extrabold text-3xl text-slate-900 mt-2">
                Administrator Orchestrator Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Stage manager, teams control, and live secret editor.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadAllData}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Data</span>
              </button>
            </div>
          </div>

          {/* Feedback Alert */}
          {message && (
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Tab Navigation Pill Strip */}
          <div className="flex flex-wrap gap-2.5">
            {[
              { id: 'stage', label: 'Stage Manager & Timer' },
              { id: 'teams', label: `Teams (${participants.length})` },
              { id: 'secrets', label: 'Live Secret Editor' },
              { id: 'logs', label: `Submissions Stream (${submissions.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-[2px_2px_0px_#0F172A]'
                    : 'bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200 shadow-sm'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Stage Manager */}
          {activeTab === 'stage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Round Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white"
                  />
                  <p className="text-xs text-slate-500">
                    Sets active timer length when starting a new round session.
                  </p>
                </div>

                <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Target Competition Round
                  </label>
                  <select
                    value={targetRound}
                    onChange={(e) => setTargetRound(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white"
                  >
                    <option value={1}>Round 1: Password Extraction (Lvl 1�5)</option>
                    <option value={2}>Round 2: Phrase Extraction (Lvl 6�9)</option>
                    <option value={3}>Round 3: Forced Output (Lvl 10�12)</option>
                  </select>
                  <p className="text-xs text-slate-500">
                    Advancing rounds unlocks beginning levels for contestant teams.
                  </p>
                </div>

              </div>

              {/* Timer Actions */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Stage Execution Controls
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <button
                    onClick={() => handleStageAction('live')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start / Resume Round</span>
                  </button>

                  <button
                    onClick={() => handleStageAction('paused')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause Timer Clock</span>
                  </button>

                  <button
                    onClick={() => handleStageAction('ended')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>End Competition</span>
                  </button>
                </div>
              </div>

              {/* Emergency Freeze Safeguard */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Emergency Incident Safeguard
                </span>
                <button
                  onClick={handleToggleFreeze}
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    timerState?.emergency_disable_submissions
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                  }`}
                >
                  <AlertOctagon className="w-5 h-5" />
                  <span>
                    {timerState?.emergency_disable_submissions
                      ? 'DEACTIVATE EMERGENCY FREEZE (RESUME SUBMISSIONS)'
                      : 'ACTIVATE EMERGENCY SUBMISSION FREEZE (HALT ALL TEAMS)'}
                  </span>
                </button>
              </div>

              {/* Export Logs */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <strong className="text-sm text-slate-900 font-display font-bold">Event Submissions Audit Export</strong>
                  <p className="text-xs text-slate-500 mt-0.5">Download full prompt logs, responses, timestamps, and solve flags.</p>
                </div>

                <div className="flex gap-3">
                  <a
                    href="/api/admin/logs/export?format=csv"
                    download
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </a>
                  <a
                    href="/api/admin/logs/export?format=json"
                    download
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Team Nodes */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              {/* Register New Team */}
              <form onSubmit={handleCreateTeam} className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <span className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-blue" />
                  <span>Register New Team</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Team Display Name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-medium focus:bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Login Username"
                    value={newTeamUsername}
                    onChange={(e) => setNewTeamUsername(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-medium focus:bg-white"
                  />
                  <input
                    type="password"
                    placeholder="Login Password"
                    value={newTeamPassword}
                    onChange={(e) => setNewTeamPassword(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-medium focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-colors"
                >
                  Create Team
                </button>
              </form>

              {/* Active Teams List */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Active Participating Teams ({participants.length})
                </span>

                <div className="space-y-2.5">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <strong className="text-slate-900 text-sm font-display font-bold">{p.team_name}</strong>
                        <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                          Username: <code className="text-slate-800">{p.username}</code> | Total Score: <span className="text-emerald-600 font-bold">{p.total_score} pts</span> | Current Level: {p.current_level_id}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-sm">
                          <span className="text-slate-500 text-[11px] font-bold">Force Lvl:</span>
                          <select
                            value={p.current_level_id}
                            onChange={(e) => handleForceLevel(p.id, Number(e.target.value))}
                            className="bg-transparent text-slate-900 font-bold text-[11px] focus:outline-none"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
                              <option key={lvl} value={lvl}>
                                Lvl {lvl}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => handleResetTeam(p.id, p.team_name)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold border border-amber-300"
                        >
                          Reset
                        </button>

                        <button
                          onClick={() => handleDeleteTeam(p.id, p.team_name)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold border border-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Live Secret Editor */}
          {activeTab === 'secrets' && (
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  Select Level to Update
                </label>
                <select
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-bold focus:bg-white"
                >
                  {levels.map((l) => (
                    <option key={l.level_id} value={l.level_id}>
                      Level {l.level_id}: {l.title} (Round {l.round_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hidden Password Secret (Round 1 & 2)
                  </label>
                  <input
                    type="text"
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                    placeholder="Leave blank to keep current secret"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Sentence (Round 3)
                  </label>
                  <input
                    type="text"
                    value={newTargetPhrase}
                    onChange={(e) => setNewTargetPhrase(e.target.value)}
                    placeholder="e.g. The eagle flies at midnight."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hint Text
                </label>
                <textarea
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  rows={3}
                  placeholder="Leave blank to keep current hint"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <button
                onClick={handleSaveSecret}
                className="w-full py-3.5 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition-colors shadow-md shadow-blue-500/25 active:scale-95"
              >
                Update Level Credentials Live (No Server Restart Needed)
              </button>
            </div>
          )}

          {/* Tab 4: Submissions Stream */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-brand-blue" />
                  <span>Real-Time Contestant Submissions Stream</span>
                </span>
                <span className="font-mono text-slate-400">{submissions.length} events logged</span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-2xl border ${
                      sub.success ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    } space-y-2`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span className="font-bold text-slate-900">
                        {sub.team_name} � Level {sub.level_id} (Attempt #{sub.attempt_number})
                      </span>
                      <span>{sub.created_at?.replace('T', ' ').substring(0, 19)}</span>
                    </div>
                    <div className="font-mono text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                      <strong>Prompt:</strong> {sub.prompt}
                    </div>
                    <div className="font-mono text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                      <strong>Response [{sub.success ? 'SOLVED' : 'REFUSED'}]:</strong> {sub.response}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="py-6 bg-white border-t border-slate-200 mt-12 text-center text-xs font-medium text-slate-400">
        Vakya-Bhed 2026 Admin Orchestrator Console
      </footer>
    </div>
  );
}

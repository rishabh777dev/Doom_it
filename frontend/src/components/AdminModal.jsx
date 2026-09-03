import React, { useState, useEffect } from 'react';
import { X, Settings, Play, Pause, Square, AlertOctagon, Download, Users, Plus, RefreshCw, CheckCircle2, AlertCircle, Key } from 'lucide-react';
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
} from '../services/api';

export default function AdminModal({ isOpen, onClose, timerState, onStateUpdated }) {
  const [activeTab, setActiveTab] = useState('stage'); // 'stage' | 'teams' | 'secrets'
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [targetRound, setTargetRound] = useState(1);
  const [participants, setParticipants] = useState([]);
  const [levels, setLevels] = useState([]);
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
    if (isOpen) {
      if (timerState?.current_round_id) setTargetRound(timerState.current_round_id);
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    try {
      const [parts, lvls, hlt] = await Promise.all([
        apiGetAdminParticipants().catch(() => []),
        apiGetAdminLevels().catch(() => []),
        apiGetAdminHealth().catch(() => null),
      ]);
      setParticipants(parts);
      setLevels(lvls);
      setHealth(hlt);
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
      setMessage({ type: 'success', text: `Competition state updated to ${status.toUpperCase()}!` });
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
      setMessage({ type: 'success', text: `Team '${newTeamName}' created successfully!` });
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
        setMessage({ type: 'error', text: 'No changes provided.' });
        return;
      }

      await apiUpdateLevelSecret(selectedLevelId, payload);
      setMessage({ type: 'success', text: `Level ${selectedLevelId} updated live! Changes active immediately.` });
      setNewSecret('');
      setNewTargetPhrase('');
      setNewHint('');
      loadAllData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-8 my-auto overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Settings className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
                Administrator Systems Control
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Global orchestrator controls for Vakya-Bhed 2026.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-4 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('stage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'stage' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Stage Manager & Timer
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'teams' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Team Nodes ({participants.length})
          </button>
          <button
            onClick={() => setActiveTab('secrets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'secrets' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Live Secret Editor
          </button>
        </div>

        {/* Tab 1: Stage Manager */}
        {activeTab === 'stage' && (
          <div className="mt-5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Round Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Competition Round
                </label>
                <select
                  value={targetRound}
                  onChange={(e) => setTargetRound(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm"
                >
                  <option value={1}>Round 1: Password Extraction (Lvl 1-5)</option>
                  <option value={2}>Round 2: Phrase Extraction (Lvl 6-9)</option>
                  <option value={3}>Round 3: Forced Output (Lvl 10-12)</option>
                </select>
              </div>
            </div>

            {/* Timer Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleStageAction('live')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start / Resume</span>
              </button>

              <button
                onClick={() => handleStageAction('paused')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause Clock</span>
              </button>

              <button
                onClick={() => handleStageAction('ended')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>End Contest</span>
              </button>
            </div>

            {/* Emergency Freeze Toggle */}
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={handleToggleFreeze}
                disabled={loading}
                className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                  timerState?.emergency_disable_submissions
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                    : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span>
                  {timerState?.emergency_disable_submissions
                    ? 'DEACTIVATE EMERGENCY SUBMISSION FREEZE'
                    : 'ACTIVATE EMERGENCY SUBMISSION FREEZE'}
                </span>
              </button>
            </div>

            {/* Log Exports */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-600 font-semibold">
              <span>Export Submissions:</span>
              <div className="flex gap-2">
                <a
                  href="/api/admin/logs/export?format=csv"
                  download
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </a>
                <a
                  href="/api/admin/logs/export?format=json"
                  download
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Team Nodes */}
        {activeTab === 'teams' && (
          <div className="mt-5 space-y-6">
            {/* Create Team */}
            <form onSubmit={handleCreateTeam} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-brand-blue" />
                <span>Register New Team</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Team Display Name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="Login Username"
                  value={newTeamUsername}
                  onChange={(e) => setNewTeamUsername(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                />
                <input
                  type="password"
                  placeholder="Login Password"
                  value={newTeamPassword}
                  onChange={(e) => setNewTeamPassword(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-black"
              >
                Add Team Node
              </button>
            </form>

            {/* Participants List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {participants.map((p) => (
                <div key={p.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 font-display font-bold">{p.team_name}</strong>
                    <div className="text-slate-400 font-mono text-[11px]">Score: {p.total_score} pts | Level: {p.current_level_id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={p.current_level_id}
                      onChange={(e) => handleForceLevel(p.id, Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
                        <option key={lvl} value={lvl}>Lvl {lvl}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleResetTeam(p.id, p.team_name)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Live Secret Editor */}
        {activeTab === 'secrets' && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Challenge Level to Update
              </label>
              <select
                value={selectedLevelId}
                onChange={(e) => setSelectedLevelId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs"
              >
                {levels.map((l) => (
                  <option key={l.level_id} value={l.level_id}>
                    Level {l.level_id}: {l.title} (Round {l.round_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hidden Password Secret (Round 1 & 2)
                </label>
                <input
                  type="text"
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
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
                rows={2}
                placeholder="Leave blank to keep unchanged"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <button
              onClick={handleSaveSecret}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl transition-colors shadow-md"
            >
              Save Level Changes Live
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

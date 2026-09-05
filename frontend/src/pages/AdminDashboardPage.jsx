import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Play,
  Pause,
  Square,
  AlertOctagon,
  Download,
  Users,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Key,
  Terminal,
  Search,
  Trash2,
  RotateCcw,
  Edit2,
  X,
  Check,
  FileText,
  Save,
  Lock,
  Copy,
  Filter
} from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import {
  apiUpdateCompetitionState,
  apiGetAdminParticipants,
  apiCreateParticipant,
  apiUpdateParticipant,
  apiResetParticipantProgress,
  apiUnlockLevel,
  apiDeleteParticipant,
  apiGetAdminLevels,
  apiUpdateLevelSecret,
  apiGetAdminSubmissions,
} from '../services/api';

export default function AdminDashboardPage({ timerState, onStateUpdated }) {
  const [activeTab, setActiveTab] = useState('stage'); // 'stage' | 'teams' | 'secrets' | 'logs'
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [targetRound, setTargetRound] = useState(1);

  // Data States
  const [participants, setParticipants] = useState([]);
  const [levels, setLevels] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Filtering & Sorting for Teams
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSort, setTeamSort] = useState('score_desc');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState('all');

  // Team Create Form States
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamUsername, setNewTeamUsername] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');

  // Team Edit Modal State
  const [editingTeam, setEditingTeam] = useState(null); // { id, team_name, password }
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamPassword, setEditTeamPassword] = useState('');

  // Live Sentinel Editor Form States
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editSystemPrompt, setEditSystemPrompt] = useState('');
  const [editSecret, setEditSecret] = useState('');
  const [editTargetPhrase, setEditTargetPhrase] = useState('');
  const [editHint, setEditHint] = useState('');

  // Submission Prompt Logs filter state
  const [logTeamFilter, setLogTeamFilter] = useState('ALL');
  const [logLevelFilter, setLogLevelFilter] = useState('ALL');
  const [logOutcomeFilter, setLogOutcomeFilter] = useState('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [copiedLogId, setCopiedLogId] = useState(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (type, text) => {
    setToast({ type, text, id: Date.now() });
  };

  useEffect(() => {
    if (timerState?.current_round_id) {
      setTargetRound(timerState.current_round_id);
    }
    fetchCoreData();

    // Live background auto-polling every 5s so data is always synchronized
    const interval = setInterval(() => {
      fetchCoreData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [timerState?.current_round_id]);

  // Ultra-Fast Data Fetching (Completes in <30ms, no slow upstream health probes!)
  const fetchCoreData = async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const [parts, lvls, subs] = await Promise.all([
        apiGetAdminParticipants().catch(() => []),
        apiGetAdminLevels().catch(() => []),
        apiGetAdminSubmissions(2000).catch(() => []),
      ]);
      setParticipants(parts);
      setLevels(lvls);
      setSubmissions(subs);
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  };

  // Computed filtered submissions for prompt ledger
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (logTeamFilter !== 'ALL') {
        if (sub.team_id !== logTeamFilter && sub.team_name !== logTeamFilter) {
          return false;
        }
      }
      if (logLevelFilter !== 'ALL') {
        if (String(sub.level_id) !== String(logLevelFilter)) {
          return false;
        }
      }
      if (logOutcomeFilter === 'SUCCESS' && !sub.success) {
        return false;
      }
      if (logOutcomeFilter === 'DEFENDED' && sub.success) {
        return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const pMatch = (sub.prompt || '').toLowerCase().includes(q);
        const rMatch = (sub.response || '').toLowerCase().includes(q);
        const tMatch = (sub.team_name || '').toLowerCase().includes(q);
        if (!pMatch && !rMatch && !tMatch) return false;
      }
      return true;
    });
  }, [submissions, logTeamFilter, logLevelFilter, logOutcomeFilter, logSearchQuery]);

  // Sync editor fields whenever selected level changes
  const activeLevel = useMemo(() => {
    return levels.find((l) => l.level_id === selectedLevelId) || null;
  }, [levels, selectedLevelId]);

  useEffect(() => {
    if (activeLevel) {
      setEditTitle(activeLevel.title || '');
      setEditObjective(activeLevel.objective || '');
      setEditSystemPrompt(activeLevel.system_prompt || '');
      setEditSecret(activeLevel.secret || '');
      setEditTargetPhrase(activeLevel.target_phrase || '');
      setEditHint(activeLevel.hint_text || '');
    }
  }, [activeLevel]);

  const handleCopyText = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // --------------------------------------------------------------------------
  // STAGE & EMERGENCY ACTIONS
  // --------------------------------------------------------------------------
  const handleStageAction = async (status) => {
    setLoading(true);
    try {
      await apiUpdateCompetitionState({
        status,
        duration_minutes: durationMinutes,
        current_round_id: targetRound,
      });
      showToast('success', `Stage set to ${status.toUpperCase()}`);
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      showToast('error', err.message || 'Failed to update competition stage.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFreeze = async () => {
    setLoading(true);
    try {
      const newFreeze = !timerState?.emergency_disable_submissions;
      await apiUpdateCompetitionState({ emergency_disable_submissions: newFreeze });
      showToast(newFreeze ? 'info' : 'success', newFreeze ? '🚨 Submissions frozen for all contestants.' : '✅ Submissions resumed.');
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // TEAM NAME & PASSWORD EDITING
  // --------------------------------------------------------------------------
  const openEditTeamModal = (team) => {
    setEditingTeam(team);
    setEditTeamName(team.team_name || '');
    setEditTeamPassword('');
  };

  const handleSaveTeamEdit = async (e) => {
    e.preventDefault();
    if (!editingTeam) return;

    const payload = {};
    if (editTeamName.trim() && editTeamName.trim() !== editingTeam.team_name) {
      payload.team_name = editTeamName.trim();
    }
    if (editTeamPassword.trim()) {
      payload.password = editTeamPassword.trim();
    }

    if (Object.keys(payload).length === 0) {
      showToast('info', 'No changes made.');
      setEditingTeam(null);
      return;
    }

    const targetId = editingTeam.id;
    const oldParticipants = [...participants];

    // 1. OPTIMISTIC UPDATE: Update name immediately in UI
    setParticipants((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, team_name: payload.team_name || p.team_name } : p))
    );
    setEditingTeam(null);
    showToast('info', 'Updating team credentials...');

    try {
      // 2. BACKGROUND API CALL
      await apiUpdateParticipant(targetId, payload);
      showToast('success', 'Team details updated successfully!');
      const updated = await apiGetAdminParticipants().catch(() => null);
      if (updated) setParticipants(updated);
    } catch (err) {
      setParticipants(oldParticipants);
      showToast('error', `Failed to update team: ${err.message}`);
    }
  };

  // --------------------------------------------------------------------------
  // OPTIMISTIC TEAM DELETION & RESET
  // --------------------------------------------------------------------------
  const handleDeleteTeam = (id, name) => {
    setConfirmModal({
      title: `Delete Team ${name}?`,
      description: `This will permanently delete ${name} and all associated logs.`,
      confirmText: 'Delete Permanently',
      confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        setConfirmModal(null);
        const prev = [...participants];
        setParticipants((p) => p.filter((item) => item.id !== id));
        showToast('info', `Deleting ${name}...`);

        try {
          await apiDeleteParticipant(id);
          showToast('success', `Team '${name}' deleted.`);
          const updated = await apiGetAdminParticipants().catch(() => null);
          if (updated) setParticipants(updated);
        } catch (err) {
          setParticipants(prev);
          showToast('error', `Failed to delete ${name}: ${err.message}`);
        }
      },
    });
  };

  const handleResetTeam = (id, name) => {
    setConfirmModal({
      title: `Reset Progress for ${name}?`,
      description: `All points for ${name} will be reset to 0 and level to 1.`,
      confirmText: 'Reset Team',
      confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        setConfirmModal(null);
        const prev = [...participants];
        setParticipants((p) =>
          p.map((item) => (item.id === id ? { ...item, total_score: 0, current_level_id: 1 } : item))
        );
        showToast('info', `Resetting ${name}...`);

        try {
          await apiResetParticipantProgress(id);
          showToast('success', `Progress for ${name} reset to Level 1.`);
          const updated = await apiGetAdminParticipants().catch(() => null);
          if (updated) setParticipants(updated);
        } catch (err) {
          setParticipants(prev);
          showToast('error', `Failed to reset ${name}: ${err.message}`);
        }
      },
    });
  };

  const handleForceLevel = async (id, lvlId, teamName) => {
    const prev = [...participants];
    setParticipants((p) =>
      p.map((item) => (item.id === id ? { ...item, current_level_id: lvlId } : item))
    );
    showToast('info', `Moving ${teamName} to Level ${lvlId}...`);

    try {
      await apiUnlockLevel(id, lvlId);
      showToast('success', `${teamName} is now at Level ${lvlId}.`);
      const updated = await apiGetAdminParticipants().catch(() => null);
      if (updated) setParticipants(updated);
    } catch (err) {
      setParticipants(prev);
      showToast('error', `Failed to force level: ${err.message}`);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamUsername.trim() || !newTeamPassword.trim()) {
      showToast('error', 'All team fields (Name, Username, Password) are required.');
      return;
    }

    const tName = newTeamName.trim();
    const tUser = newTeamUsername.trim();
    const tPass = newTeamPassword.trim();

    setNewTeamName('');
    setNewTeamUsername('');
    setNewTeamPassword('');

    const tempId = `temp-${Date.now()}`;
    setParticipants((prev) => [
      { id: tempId, team_name: tName, username: tUser, total_score: 0, current_level_id: 1, is_optimistic: true },
      ...prev,
    ]);
    showToast('info', `Registering ${tName}...`);

    try {
      await apiCreateParticipant({ team_name: tName, username: tUser, password: tPass });
      showToast('success', `Team '${tName}' registered!`);
      const updated = await apiGetAdminParticipants().catch(() => null);
      if (updated) setParticipants(updated);
    } catch (err) {
      setParticipants((prev) => prev.filter((p) => p.id !== tempId));
      showToast('error', `Failed to create team: ${err.message}`);
    }
  };

  // --------------------------------------------------------------------------
  // LIVE SENTINEL & SYSTEM PROMPT EDITING
  // --------------------------------------------------------------------------
  const handleSaveSentinel = async () => {
    const payload = {
      title: editTitle.trim(),
      objective: editObjective.trim(),
      system_prompt: editSystemPrompt.trim(),
      secret: editSecret.trim(),
      target_phrase: editTargetPhrase.trim(),
      hint_text: editHint.trim(),
    };

    // 1. OPTIMISTIC UPDATE: Update level in memory
    const prevLevels = [...levels];
    setLevels((prev) =>
      prev.map((l) => (l.level_id === selectedLevelId ? { ...l, ...payload } : l))
    );
    showToast('info', `Deploying Level ${selectedLevelId} changes live...`);

    try {
      await apiUpdateLevelSecret(selectedLevelId, payload);
      showToast('success', `Level ${selectedLevelId} updated live! Active in arena immediately.`);
      const updated = await apiGetAdminLevels().catch(() => null);
      if (updated) setLevels(updated);
    } catch (err) {
      setLevels(prevLevels);
      showToast('error', `Failed to update level: ${err.message}`);
    }
  };

  // Filtered & Sorted Teams
  const filteredParticipants = useMemo(() => {
    let list = [...participants];

    if (teamSearch.trim()) {
      const q = teamSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.team_name?.toLowerCase().includes(q) ||
          p.username?.toLowerCase().includes(q)
      );
    }

    if (selectedRoundFilter !== 'all') {
      const r = Number(selectedRoundFilter);
      list = list.filter((p) => Math.ceil(p.current_level_id / 4) === r);
    }

    list.sort((a, b) => {
      if (teamSort === 'score_desc') return (b.total_score || 0) - (a.total_score || 0);
      if (teamSort === 'level_desc') return (b.current_level_id || 1) - (a.current_level_id || 1);
      if (teamSort === 'name_asc') return (a.team_name || '').localeCompare(b.team_name || '');
      return 0;
    });

    return list;
  }, [participants, teamSearch, teamSort, selectedRoundFilter]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-brand-blue selection:text-white flex flex-col justify-between">
      <div>
        <AdminNavbar timerState={timerState} />

        {/* Global Floating Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div
              className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-emerald-900/95 text-white border-emerald-500 shadow-emerald-500/20'
                  : toast.type === 'error'
                  ? 'bg-rose-900/95 text-white border-rose-500 shadow-rose-500/20'
                  : 'bg-slate-900/95 text-sky-400 border-slate-700 shadow-blue-500/20'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {toast.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />}
              <span>{toast.text}</span>
              <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Edit Team Modal */}
        {editingTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-7 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-brand-blue" />
                  <span>Edit Team Credentials</span>
                </span>
                <button
                  onClick={() => setEditingTeam(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTeamEdit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Team Display Name
                  </label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>New Password Key</span>
                    <span className="text-[10px] text-slate-400 font-normal">Leave blank to keep unchanged</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter new password (optional)"
                    value={editTeamPassword}
                    onChange={(e) => setEditTeamPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTeam(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-blue-700 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-7 space-y-4 animate-scale-up">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-display font-black text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer ${confirmModal.confirmClass}`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          {/* Top Page Header (Flat, Clean, Fast) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Orchestrator Console
                </span>

                {/* Live Competition & Round Status Pill */}
                {timerState?.status === 'running' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ROUND {timerState?.current_round_id || 1} ACTIVE
                  </span>
                ) : timerState?.status === 'paused' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    STAGE PAUSED
                  </span>
                ) : timerState?.status === 'ended' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    COMPETITION CONCLUDED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    STAGE READY (OFFLINE)
                  </span>
                )}

                {/* Auto-sync status badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Live Auto-Sync Active (5s)
                </span>

                <span className="text-xs text-slate-500 font-medium">
                  {participants.length} Active Teams
                </span>
              </div>
              <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">
                Tournament Command Center
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchCoreData(false)}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Force refresh database state immediately"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-blue' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
            {[
              { id: 'stage', label: 'Competition Stage', icon: Play },
              { id: 'teams', label: `Teams Management (${participants.length})`, icon: Users },
              { id: 'secrets', label: 'Live Sentinel & System Prompt', icon: Key },
              { id: 'logs', label: `Submission Prompt Logs (${submissions.length})`, icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: STAGE CONTROL                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'stage' && (
            <div className="space-y-6">
              
              {/* Competition Clock & Stage Controller */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-5">
                <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-blue" />
                  <span>Round & Stage Manager</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Target Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Active Round
                    </label>
                    <select
                      value={targetRound}
                      onChange={(e) => setTargetRound(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white"
                    >
                      <option value={1}>Round 1: Password Extraction (Levels 01 - 05)</option>
                      <option value={2}>Round 2: Secret Phrase Extraction (Levels 06 - 09)</option>
                      <option value={3}>Round 3: System Prompt Extraction (Levels 10 - 12)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => handleStageAction('live')}
                    disabled={loading}
                    className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>START / RESUME ARENA</span>
                  </button>

                  <button
                    onClick={() => handleStageAction('paused')}
                    disabled={loading}
                    className="py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>PAUSE TIMER</span>
                  </button>

                  <button
                    onClick={() => handleStageAction('ended')}
                    disabled={loading}
                    className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>END COMPETITION</span>
                  </button>
                </div>
              </div>

              {/* Emergency Submissions Freeze */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
                <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>Submissions Freeze Controller</span>
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Instantly halts prompt inputs across all contestant terminals. Use for announcements or breaks.
                </p>
                <button
                  onClick={handleToggleFreeze}
                  disabled={loading}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    timerState?.emergency_disable_submissions
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>
                    {timerState?.emergency_disable_submissions
                      ? 'RESUME ALL CONTESTANT SUBMISSIONS'
                      : 'FREEZE ALL CONTESTANT SUBMISSIONS'}
                  </span>
                </button>
              </div>

              {/* Export Logs */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <strong className="text-sm text-slate-900 font-display font-bold">Submission Prompt Logs Export</strong>
                  <p className="text-xs text-slate-500 mt-0.5">Download contestant prompts, model responses, and solve flags.</p>
                </div>

                <div className="flex gap-2.5">
                  <a
                    href="/api/admin/logs/export?format=csv"
                    download
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </a>
                  <a
                    href="/api/admin/logs/export?format=json"
                    download
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TEAMS MANAGEMENT (FAST, WITH NAME & PASSWORD EDITING)              */}
          {/* ========================================================================= */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              
              {/* Register New Team */}
              <form onSubmit={handleCreateTeam} className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
                <span className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-blue" />
                  <span>Register Team</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Team Name (e.g. CyberKnights)"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Login Username"
                    value={newTeamUsername}
                    onChange={(e) => setNewTeamUsername(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white"
                  />
                  <input
                    type="password"
                    placeholder="Login Password"
                    value={newTeamPassword}
                    onChange={(e) => setNewTeamPassword(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Team</span>
                </button>
              </form>

              {/* Teams Explorer with Search, Filters & Edit */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Participating Teams ({filteredParticipants.length})
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search team or user..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="pl-7 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white w-44 sm:w-52"
                      />
                    </div>

                    <select
                      value={selectedRoundFilter}
                      onChange={(e) => setSelectedRoundFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
                    >
                      <option value="all">All Rounds</option>
                      <option value="1">Round 1 (Lv 1-5)</option>
                      <option value="2">Round 2 (Lv 6-9)</option>
                      <option value="3">Round 3 (Lv 10-12)</option>
                    </select>

                    <select
                      value={teamSort}
                      onChange={(e) => setTeamSort(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
                    >
                      <option value="score_desc">Score (High-Low)</option>
                      <option value="level_desc">Level (High-Low)</option>
                      <option value="name_asc">Name (A-Z)</option>
                    </select>
                  </div>
                </div>

                {/* Team Rows */}
                <div className="space-y-2">
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((p) => (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          p.is_optimistic ? 'bg-blue-50/60 border-blue-200 animate-pulse' : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 text-sm font-display font-bold">
                              {p.team_name}
                            </strong>
                            <span className="text-slate-400 font-mono text-[11px]">(@{p.username})</span>
                          </div>
                          <div className="text-slate-500 font-mono text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                            <span>Score: <strong className="text-emerald-700">{p.total_score || 0} pts</strong></span>
                            <span>•</span>
                            <span>Level: <strong>{p.current_level_id || 1}</strong></span>
                          </div>
                        </div>

                        {/* Interactive Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Force Level */}
                          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                            <span className="text-slate-500 text-[10px] font-bold">Lvl:</span>
                            <select
                              value={p.current_level_id || 1}
                              onChange={(e) => handleForceLevel(p.id, Number(e.target.value), p.team_name)}
                              className="bg-transparent text-slate-900 font-black text-[11px] focus:outline-none cursor-pointer"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  {lvl}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Edit Team Name & Password */}
                          <button
                            onClick={() => openEditTeamModal(p)}
                            title="Edit Team Name or Password"
                            className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-brand-blue font-bold border border-blue-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {/* Reset Progress */}
                          <button
                            onClick={() => handleResetTeam(p.id, p.team_name)}
                            title="Reset score to 0"
                            className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>

                          {/* Delete Team */}
                          <button
                            onClick={() => handleDeleteTeam(p.id, p.team_name)}
                            title="Delete team"
                            className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No teams match your search.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: LIVE SENTINEL & SYSTEM PROMPT EDITOR (NO CODE EDITING NEEDED!)     */}
          {/* ========================================================================= */}
          {activeTab === 'secrets' && (
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                    <Key className="w-5 h-5 text-brand-blue" />
                    <span>Sentinel System Prompt & Guardrails Editor</span>
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live changes take effect on the next contestant prompt with zero server restarts.
                  </p>
                </div>

                <button
                  onClick={handleSaveSentinel}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Deploy Sentinel Live</span>
                </button>
              </div>

              {/* Level Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Select Multiverse Sentinel Level
                </label>
                <select
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-bold focus:bg-white cursor-pointer"
                >
                  {levels.map((l) => (
                    <option key={l.level_id} value={l.level_id}>
                      Level {String(l.level_id).padStart(2, '0')}: {l.title} (Round {l.round_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sentinel Title & Objective */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sentinel Persona Name
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. J.A.R.V.I.S. or Steve Rogers"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mission Objective
                  </label>
                  <input
                    type="text"
                    value={editObjective}
                    onChange={(e) => setEditObjective(e.target.value)}
                    placeholder="e.g. Extract the hidden security passcode"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* System Prompt Code Box (Crucial for live defense tweaking) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>AI System Prompt (Behavior, Guardrails & Persona Instructions)</span>
                  <span className="text-[10px] text-brand-blue font-mono font-bold">Active in Arena</span>
                </label>
                <textarea
                  value={editSystemPrompt}
                  onChange={(e) => setEditSystemPrompt(e.target.value)}
                  rows={6}
                  placeholder="You are J.A.R.V.I.S., Tony Stark's AI assistant..."
                  className="w-full p-3 rounded-2xl bg-slate-900 text-sky-300 font-mono text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                />
              </div>

              {/* Secret & Target Phrase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Secret Password Key (Rounds 1 & 2)
                  </label>
                  <input
                    type="text"
                    value={editSecret}
                    onChange={(e) => setEditSecret(e.target.value)}
                    placeholder="e.g. STARK_MARK_85"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Forced Sentence (Round 3)
                  </label>
                  <input
                    type="text"
                    value={editTargetPhrase}
                    onChange={(e) => setEditTargetPhrase(e.target.value)}
                    placeholder="e.g. I surrender the infinity gauntlet."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Hint Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tactical Hint
                </label>
                <input
                  type="text"
                  value={editHint}
                  onChange={(e) => setEditHint(e.target.value)}
                  placeholder="Optional hint for struggling contestants..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <button
                onClick={handleSaveSentinel}
                className="w-full py-3 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save & Deploy Sentinel Live</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SUBMISSION PROMPT LOGS LEDGER                                      */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <div className="space-y-5">
              
              {/* Main Ledger Header & Filter Box */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-brand-blue flex items-center justify-center shadow-sm">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-display font-black text-slate-900">
                        Submission Prompt Logs
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Real-time attack ledger of participant prompt injections, model responses, and breach validations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-sm">
                      Showing {filteredSubmissions.length} of {submissions.length} Total Logs
                    </span>
                    <button
                      onClick={() => fetchCoreData(false)}
                      disabled={isRefreshing}
                      className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 transition-all cursor-pointer"
                      title="Sync latest submissions"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-blue' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {/* Team Filter Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Filter by Team Ledger:</span>
                    </label>
                    <select
                      value={logTeamFilter}
                      onChange={(e) => setLogTeamFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
                    >
                      <option value="ALL">All Teams ({submissions.length} logs)</option>
                      {participants.map((p) => {
                        const count = submissions.filter(
                          (s) => s.team_id === p.id || s.team_name === p.team_name
                        ).length;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.team_name} ({count} logs)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Level Filter Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <span>Filter by Level:</span>
                    </label>
                    <select
                      value={logLevelFilter}
                      onChange={(e) => setLogLevelFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
                    >
                      <option value="ALL">All Levels (1 - 12)</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          Level {lvl} {lvl <= 5 ? '(R1)' : lvl <= 9 ? '(R2)' : '(R3)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Outcome Filter Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-slate-400" />
                      <span>Filter by Outcome:</span>
                    </label>
                    <select
                      value={logOutcomeFilter}
                      onChange={(e) => setLogOutcomeFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
                    >
                      <option value="ALL">All Outcomes</option>
                      <option value="SUCCESS">Breached / Solved 🏆</option>
                      <option value="DEFENDED">Defended / Refused 🛡️</option>
                    </select>
                  </div>

                  {/* Search Query */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                      <Search className="w-3 h-3 text-slate-400" />
                      <span>Search Prompts / Responses:</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Keyword or attack query..."
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
                      />
                      {logSearchQuery && (
                        <button
                          onClick={() => setLogSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Quick Selection Chips */}
                {participants.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Team Ledgers:
                    </span>
                    <button
                      onClick={() => setLogTeamFilter('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        logTeamFilter === 'ALL'
                          ? 'bg-brand-blue text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      All ({submissions.length})
                    </button>
                    {participants.map((p) => {
                      const count = submissions.filter(
                        (s) => s.team_id === p.id || s.team_name === p.team_name
                      ).length;
                      const isSelected = logTeamFilter === p.id || logTeamFilter === p.team_name;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setLogTeamFilter(isSelected ? 'ALL' : p.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-brand-blue text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{p.team_name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {(logTeamFilter !== 'ALL' || logLevelFilter !== 'ALL' || logOutcomeFilter !== 'ALL' || logSearchQuery.trim()) && (
                      <button
                        onClick={() => {
                          setLogTeamFilter('ALL');
                          setLogLevelFilter('ALL');
                          setLogOutcomeFilter('ALL');
                          setLogSearchQuery('');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap ml-auto"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Submissions List / Ledger Stream */}
              <div className="space-y-3">
                {filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((sub) => {
                    const roundNum = sub.round_id || (sub.level_id <= 5 ? 1 : sub.level_id <= 9 ? 2 : 3);
                    const promptCopyKey = `prompt-${sub.id}`;
                    const respCopyKey = `resp-${sub.id}`;

                    return (
                      <div
                        key={sub.id}
                        className={`bg-white rounded-2xl border-2 p-4 transition-all space-y-3 ${
                          sub.success
                            ? 'border-emerald-500 shadow-sm bg-gradient-to-r from-emerald-50/40 via-white to-white'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Meta header row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setLogTeamFilter(sub.team_id || sub.team_name)}
                              className="font-display font-extrabold text-slate-900 hover:text-brand-blue cursor-pointer flex items-center gap-1.5"
                              title="Click to view only this team's logs"
                            >
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-sm">{sub.team_name}</span>
                            </button>

                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200 text-[11px]">
                              Level {sub.level_id} (Round {roundNum})
                            </span>

                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-[11px]">
                              Attempt #{sub.attempt_number}
                            </span>

                            {sub.latency_ms > 0 && (
                              <span className="text-[11px] font-mono text-slate-400">
                                {sub.latency_ms}ms
                              </span>
                            )}

                            {sub.model_name && sub.model_name !== 'unknown' && (
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {sub.model_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {sub.success ? (
                              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                                🏆 FLAG BREACHED (+{sub.score_awarded} pts)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                🛡️ DEFENDED / REFUSED
                              </span>
                            )}

                            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                              {sub.created_at ? new Date(sub.created_at).toLocaleString() : ''}
                            </span>
                          </div>
                        </div>

                        {/* Contestant Prompt Box */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>Contestant Prompt Payload:</span>
                            <button
                              onClick={() => handleCopyText(sub.prompt, promptCopyKey)}
                              className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedLogId === promptCopyKey ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Prompt</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap break-words max-h-48 overflow-y-auto select-text leading-relaxed">
                            {sub.prompt || <em className="text-slate-400">Empty prompt string</em>}
                          </div>
                        </div>

                        {/* Model Response Box */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>Sentinel Model Response:</span>
                            <button
                              onClick={() => handleCopyText(sub.response, respCopyKey)}
                              className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedLogId === respCopyKey ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Output</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div
                            className={`p-3 rounded-xl border font-mono text-xs whitespace-pre-wrap break-words max-h-48 overflow-y-auto select-text leading-relaxed ${
                              sub.success
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-semibold'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            {sub.response || <em className="text-slate-400">Empty response from model</em>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white rounded-3xl border-2 border-slate-900 p-12 shadow-card text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        {submissions.length === 0 ? 'No Submissions Recorded Yet' : 'No Matching Submission Logs'}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {submissions.length === 0
                          ? 'Once teams submit prompt attempts in the Arena, their full attack payload and response stream will appear here in real-time.'
                          : 'No submissions matched your active filters. Try selecting "All Teams" or clearing the search query.'}
                      </p>
                    </div>
                    {submissions.length > 0 && (
                      <button
                        onClick={() => {
                          setLogTeamFilter('ALL');
                          setLogLevelFilter('ALL');
                          setLogOutcomeFilter('ALL');
                          setLogSearchQuery('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>

      <footer className="py-5 bg-white border-t border-slate-200 mt-12 text-center text-xs font-medium text-slate-400">
        VakyaBhed 2026 Admin Console • Zero-Latency Streamlined Control
      </footer>
    </div>
  );
}

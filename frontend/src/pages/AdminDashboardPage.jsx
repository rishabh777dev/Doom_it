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
  Shield,
  FileText,
  Search,
  ArrowUpDown,
  Trash2,
  RotateCcw,
  Sparkles,
  X,
  Check,
  Zap,
  Activity,
  Award,
  Layers
} from 'lucide-react';
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
  
  // Data States
  const [participants, setParticipants] = useState([]);
  const [levels, setLevels] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [health, setHealth] = useState(null);
  
  // Filtering & Sorting for Teams
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSort, setTeamSort] = useState('score_desc'); // 'score_desc' | 'level_desc' | 'name_asc'
  const [selectedRoundFilter, setSelectedRoundFilter] = useState('all');

  // Form States
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [newSecret, setNewSecret] = useState('');
  const [newTargetPhrase, setNewTargetPhrase] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamUsername, setNewTeamUsername] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', text: string, id: number }
  const [confirmModal, setConfirmModal] = useState(null); // { title, description, confirmText, onConfirm }

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
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
    // Fast initial load
    fetchCoreData();
    // Independent background health probe (doesn't block UI)
    fetchHealthData();
  }, [timerState?.current_round_id]);

  // Fast Core Data Fetch (Teams, Levels, Submissions - completes in <50ms)
  const fetchCoreData = async () => {
    setIsRefreshing(true);
    try {
      const [parts, lvls, subs] = await Promise.all([
        apiGetAdminParticipants().catch(() => []),
        apiGetAdminLevels().catch(() => []),
        apiGetAdminSubmissions(100).catch(() => []),
      ]);
      setParticipants(parts);
      setLevels(lvls);
      setSubmissions(subs);
    } catch (e) {
      console.error('Core data load error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Independent Health Probe (probes upstream cloud models in background)
  const fetchHealthData = async () => {
    try {
      const hlt = await apiGetAdminHealth().catch(() => null);
      setHealth(hlt);
    } catch (e) {
      console.error('Health probe error:', e);
    }
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
      showToast('success', `Competition stage switched to ${status.toUpperCase()}`);
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
      showToast(newFreeze ? 'info' : 'success', newFreeze ? '🚨 Arena submissions frozen for all contestants.' : '✅ Arena submissions resumed.');
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // OPTIMISTIC TEAM MUTATIONS (Zero-Lag Background Synchronization)
  // --------------------------------------------------------------------------
  const handleDeleteTeam = (id, name) => {
    setConfirmModal({
      title: `Delete Team ${name}?`,
      description: `This will permanently delete ${name}, their authentication session, and all prompt logs. This cannot be undone.`,
      confirmText: 'Delete Permanently',
      confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        setConfirmModal(null);
        // 1. OPTIMISTIC UPDATE: Remove instantly from local state
        const previousParticipants = [...participants];
        setParticipants((prev) => prev.filter((p) => p.id !== id));
        showToast('info', `Deleting ${name} in background...`);

        try {
          // 2. BACKGROUND API CALL
          await apiDeleteParticipant(id);
          showToast('success', `Team '${name}' successfully deleted.`);
          // 3. Silent background refresh
          const updated = await apiGetAdminParticipants().catch(() => null);
          if (updated) setParticipants(updated);
        } catch (err) {
          // Rollback on server failure
          setParticipants(previousParticipants);
          showToast('error', `Failed to delete ${name}: ${err.message}`);
        }
      },
    });
  };

  const handleResetTeam = (id, name) => {
    setConfirmModal({
      title: `Reset Progress for ${name}?`,
      description: `All points for ${name} will be reset to 0, unlocked levels returned to Level 1, and attempts cleared.`,
      confirmText: 'Reset Team Progress',
      confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        setConfirmModal(null);
        // 1. OPTIMISTIC UPDATE: Update score and level locally in 0ms
        const previousParticipants = [...participants];
        setParticipants((prev) =>
          prev.map((p) => (p.id === id ? { ...p, total_score: 0, current_level_id: 1, attempts: {} } : p))
        );
        showToast('info', `Resetting ${name} in background...`);

        try {
          // 2. BACKGROUND API CALL
          await apiResetParticipantProgress(id);
          showToast('success', `Progress for ${name} reset to Level 01.`);
          const updated = await apiGetAdminParticipants().catch(() => null);
          if (updated) setParticipants(updated);
        } catch (err) {
          setParticipants(previousParticipants);
          showToast('error', `Failed to reset ${name}: ${err.message}`);
        }
      },
    });
  };

  const handleForceLevel = async (id, lvlId, teamName) => {
    // 1. OPTIMISTIC UPDATE: Update level number locally
    const previousParticipants = [...participants];
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, current_level_id: lvlId } : p))
    );
    showToast('info', `Updating ${teamName} to Level ${lvlId}...`);

    try {
      // 2. BACKGROUND API CALL
      await apiUnlockLevel(id, lvlId);
      showToast('success', `${teamName} is now at Level ${lvlId}.`);
      const updated = await apiGetAdminParticipants().catch(() => null);
      if (updated) setParticipants(updated);
    } catch (err) {
      setParticipants(previousParticipants);
      showToast('error', `Failed to force level: ${err.message}`);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamUsername.trim() || !newTeamPassword.trim()) {
      showToast('error', 'All team fields (Name, Username, Password) are required.');
      return;
    }

    const tempName = newTeamName.trim();
    const tempUsername = newTeamUsername.trim();
    const tempPassword = newTeamPassword.trim();

    // Reset inputs immediately
    setNewTeamName('');
    setNewTeamUsername('');
    setNewTeamPassword('');

    // 1. OPTIMISTIC INSERT: Show temporary row immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticTeam = {
      id: tempId,
      team_name: tempName,
      username: tempUsername,
      total_score: 0,
      current_level_id: 1,
      is_optimistic: true,
    };
    setParticipants((prev) => [optimisticTeam, ...prev]);
    showToast('info', `Registering ${tempName}...`);

    try {
      // 2. BACKGROUND API CALL
      await apiCreateParticipant({
        team_name: tempName,
        username: tempUsername,
        password: tempPassword,
      });
      showToast('success', `Team '${tempName}' registered successfully!`);
      // 3. Silent background refresh to get real DB record
      const updated = await apiGetAdminParticipants().catch(() => null);
      if (updated) setParticipants(updated);
    } catch (err) {
      setParticipants((prev) => prev.filter((p) => p.id !== tempId));
      showToast('error', `Failed to create team: ${err.message}`);
    }
  };

  // --------------------------------------------------------------------------
  // LIVE SECRET EDITOR
  // --------------------------------------------------------------------------
  const activeLevelData = useMemo(() => {
    return levels.find((l) => l.level_id === selectedLevelId) || null;
  }, [levels, selectedLevelId]);

  const handleSaveSecret = async () => {
    const payload = {};
    if (newSecret.trim()) payload.secret = newSecret.trim();
    if (newTargetPhrase.trim()) payload.target_phrase = newTargetPhrase.trim();
    if (newHint.trim()) payload.hint_text = newHint.trim();

    if (Object.keys(payload).length === 0) {
      showToast('error', 'Please enter a new secret, target sentence, or hint.');
      return;
    }

    // 1. OPTIMISTIC UPDATE: Update level in memory
    const prevLevels = [...levels];
    setLevels((prev) =>
      prev.map((l) => (l.level_id === selectedLevelId ? { ...l, ...payload } : l))
    );
    showToast('info', `Updating Level ${selectedLevelId} live...`);

    try {
      await apiUpdateLevelSecret(selectedLevelId, payload);
      showToast('success', `Level ${selectedLevelId} updated live! Active in arena immediately.`);
      setNewSecret('');
      setNewTargetPhrase('');
      setNewHint('');
      const updated = await apiGetAdminLevels().catch(() => null);
      if (updated) setLevels(updated);
    } catch (err) {
      setLevels(prevLevels);
      showToast('error', `Failed to update level credentials: ${err.message}`);
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED & SORTED PARTICIPANTS
  // --------------------------------------------------------------------------
  const filteredParticipants = useMemo(() => {
    let list = [...participants];

    // Search query
    if (teamSearch.trim()) {
      const q = teamSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.team_name?.toLowerCase().includes(q) ||
          p.username?.toLowerCase().includes(q)
      );
    }

    // Round filter
    if (selectedRoundFilter !== 'all') {
      const targetR = Number(selectedRoundFilter);
      list = list.filter((p) => {
        // Level 1-4 is Round 1, 5-8 is Round 2, 9-12 is Round 3
        const round = Math.ceil(p.current_level_id / 4);
        return round === targetR;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (teamSort === 'score_desc') return (b.total_score || 0) - (a.total_score || 0);
      if (teamSort === 'level_desc') return (b.current_level_id || 1) - (a.current_level_id || 1);
      if (teamSort === 'name_asc') return (a.team_name || '').localeCompare(b.team_name || '');
      return 0;
    });

    return list;
  }, [participants, teamSearch, teamSort, selectedRoundFilter]);

  // Overall statistics for Top Metric Bar
  const stats = useMemo(() => {
    const total = participants.length;
    const topScore = participants.reduce((max, p) => Math.max(max, p.total_score || 0), 0);
    const avgScore = total ? Math.round(participants.reduce((sum, p) => sum + (p.total_score || 0), 0) / total) : 0;
    const maxLevel = participants.reduce((max, p) => Math.max(max, p.current_level_id || 1), 1);
    return { total, topScore, avgScore, maxLevel };
  }, [participants]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-brand-blue selection:text-white flex flex-col justify-between">
      <div>
        <AdminNavbar timerState={timerState} />

        {/* Global Floating Toast Notification */}
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
              <button
                onClick={() => setToast(null)}
                className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-7 space-y-4 animate-scale-up">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer ${confirmModal.confirmClass}`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
          
          {/* Top Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Root Controller
                </span>
                <span className="text-xs font-medium text-slate-400 font-mono">v2.4 Enterprise</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 mt-1">
                Tournament Command Console
              </h1>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchCoreData}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Sync database data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-blue' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Metric Overview Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Teams</p>
                <p className="text-xl font-black text-slate-900">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Score</p>
                <p className="text-xl font-black text-slate-900">{stats.topScore} <span className="text-xs text-slate-400">PTS</span></p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Farthest Level</p>
                <p className="text-xl font-black text-slate-900">Level {stats.maxLevel}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                timerState?.emergency_disable_submissions
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}>
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Arena Status</p>
                <p className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${timerState?.emergency_disable_submissions ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                  {timerState?.emergency_disable_submissions ? 'FROZEN' : (timerState?.status || 'OFFLINE')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
            {[
              { id: 'stage', label: 'Stage Control & Health', icon: Play },
              { id: 'teams', label: `Teams Management (${participants.length})`, icon: Users },
              { id: 'secrets', label: 'Live Sentinel Credentials', icon: Key },
              { id: 'logs', label: `Submissions Audit (${submissions.length})`, icon: FileText },
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
          {/* TAB 1: STAGE CONTROL & HEALTH                                             */}
          {/* ========================================================================= */}
          {activeTab === 'stage' && (
            <div className="space-y-6">
              
              {/* Competition Clock & Stage Controller */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-brand-blue" />
                    <span>Competition Stage & Round Manager</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    State: <span className="text-brand-blue uppercase">{timerState?.status || 'OFFLINE'}</span>
                  </span>
                </div>

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
                      Activate Round (1-3)
                    </label>
                    <select
                      value={targetRound}
                      onChange={(e) => setTargetRound(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white"
                    >
                      <option value={1}>Round 1: Levels 01 - 04 (Extraction)</option>
                      <option value={2}>Round 2: Levels 05 - 08 (Direct Jailbreak)</option>
                      <option value={3}>Round 3: Levels 09 - 12 (Target Phrase Forcing)</option>
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
                    <span>PAUSE ARENA TIMER</span>
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

              {/* Emergency Arena Freeze Button */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-3">
                <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>Room-Wide Submissions Freeze ("God Mode Lock")</span>
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Instantly halts all prompt submissions and flag verifications across every contestant terminal in the hall. Use for announcements, urgent briefings, or lunch breaks.
                </p>
                <button
                  onClick={handleToggleFreeze}
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer ${
                    timerState?.emergency_disable_submissions
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
                  }`}
                >
                  <AlertOctagon className="w-5 h-5" />
                  <span>
                    {timerState?.emergency_disable_submissions
                      ? 'DEACTIVATE EMERGENCY FREEZE (RESUME ALL SUBMISSIONS)'
                      : 'ACTIVATE EMERGENCY SUBMISSION FREEZE (LOCK ALL TEAMS)'}
                  </span>
                </button>
              </div>

              {/* Upstream Cloud Health Dashboard */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-blue" />
                    <span>Cloud Providers & Infrastructure Health</span>
                  </span>
                  <button
                    onClick={fetchHealthData}
                    className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Probe Status</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {health ? (
                    Object.entries(health).map(([provider, status]) => {
                      const isUp = typeof status === 'string' && status.includes('UP');
                      const isHealthy = status === 'healthy' || isUp;
                      return (
                        <div
                          key={provider}
                          className={`p-3.5 rounded-2xl border ${
                            isHealthy
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          } flex flex-col justify-between`}
                        >
                          <span className="font-bold text-[11px] truncate mb-1">{provider}</span>
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                            {String(status)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-4 p-4 text-center text-xs text-slate-400">
                      Probing live cloud provider health...
                    </div>
                  )}
                </div>
              </div>

              {/* Submissions Audit Export */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <strong className="text-sm text-slate-900 font-display font-bold">Event Audit Log Download</strong>
                  <p className="text-xs text-slate-500 mt-0.5">Export all contestants' prompts, responses, timestamps, and attack payloads.</p>
                </div>

                <div className="flex gap-3">
                  <a
                    href="/api/admin/logs/export?format=csv"
                    download
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </a>
                  <a
                    href="/api/admin/logs/export?format=json"
                    download
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TEAMS MANAGEMENT (OPTIMISTIC UI + INSTANT SEARCH & SORT)           */}
          {/* ========================================================================= */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              
              {/* Register New Team Card */}
              <form onSubmit={handleCreateTeam} className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-brand-blue" />
                    <span>Fast Team Registration</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Added instantly to arena</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Team Display Name (e.g. CyberKnights)"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
                  />
                  <input
                    type="text"
                    placeholder="Login Username (e.g. cyber_knights)"
                    value={newTeamUsername}
                    onChange={(e) => setNewTeamUsername(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
                  />
                  <input
                    type="password"
                    placeholder="Login Password Key"
                    value={newTeamPassword}
                    onChange={(e) => setNewTeamPassword(e.target.value)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register & Authorize Team</span>
                </button>
              </form>

              {/* Active Teams Explorer with Search, Filters & Sorting */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                
                {/* Header with Search and Sorting Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Active Tournament Teams ({filteredParticipants.length} of {participants.length})
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">Manage credentials, force level jumps, or reset scores in real-time.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search team or username..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white w-48 sm:w-56"
                      />
                      {teamSearch && (
                        <button
                          onClick={() => setTeamSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Round Filter */}
                    <select
                      value={selectedRoundFilter}
                      onChange={(e) => setSelectedRoundFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
                    >
                      <option value="all">All Rounds</option>
                      <option value="1">Round 1 (Lv 1-4)</option>
                      <option value="2">Round 2 (Lv 5-8)</option>
                      <option value="3">Round 3 (Lv 9-12)</option>
                    </select>

                    {/* Sort Order */}
                    <select
                      value={teamSort}
                      onChange={(e) => setTeamSort(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
                    >
                      <option value="score_desc">Sort: Highest Score</option>
                      <option value="level_desc">Sort: Farthest Level</option>
                      <option value="name_asc">Sort: Name (A-Z)</option>
                    </select>
                  </div>
                </div>

                {/* Team Rows List */}
                <div className="space-y-2.5">
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((p) => (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          p.is_optimistic
                            ? 'bg-blue-50/60 border-blue-200 animate-pulse'
                            : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 text-sm font-display font-bold">
                              {p.team_name}
                            </strong>
                            {p.is_optimistic && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue border border-blue-200">
                                Syncing...
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                            <span>User: <code className="text-slate-800 font-bold">{p.username}</code></span>
                            <span>•</span>
                            <span>Score: <strong className="text-emerald-700">{p.total_score || 0} pts</strong></span>
                            <span>•</span>
                            <span>Level: <strong>{p.current_level_id || 1}</strong></span>
                          </div>
                        </div>

                        {/* Interactive Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Force Level Dropdown */}
                          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-sm">
                            <span className="text-slate-500 text-[11px] font-bold">Level:</span>
                            <select
                              value={p.current_level_id || 1}
                              onChange={(e) => handleForceLevel(p.id, Number(e.target.value), p.team_name)}
                              className="bg-transparent text-slate-900 font-black text-[11px] focus:outline-none cursor-pointer"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  Lvl {lvl}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Reset Button */}
                          <button
                            onClick={() => handleResetTeam(p.id, p.team_name)}
                            title="Reset score to 0 and level to 1"
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteTeam(p.id, p.team_name)}
                            title="Permanently remove team from competition"
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No participating teams match your filter criteria.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: LIVE SENTINEL CREDENTIALS EDITOR                                   */}
          {/* ========================================================================= */}
          {activeTab === 'secrets' && (
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-6">
              
              <div>
                <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-brand-blue" />
                  <span>Real-Time Guardian Sentinel Secret Editor</span>
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Changes take effect immediately across all active contestant prompt evaluations without restarting the backend.
                </p>
              </div>

              {/* Level Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Target Level to Modify
                </label>
                <select
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-bold focus:bg-white cursor-pointer"
                >
                  {levels.map((l) => (
                    <option key={l.level_id} value={l.level_id}>
                      Level {String(l.level_id).padStart(2, '0')}: {l.title} — Round {l.round_id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sentinel Snapshot Info Box */}
              {activeLevelData && (
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-blue uppercase tracking-wider text-[11px]">
                      Current Live Snapshot • {activeLevelData.title}
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      Level ID #{activeLevelData.level_id}
                    </span>
                  </div>
                  <p className="text-slate-700"><strong>Objective:</strong> {activeLevelData.objective}</p>
                  <p className="text-slate-600 font-mono text-[11px] truncate">
                    <strong>Active Secret:</strong> <span className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">{activeLevelData.secret || '(None / Round 3 phrase)'}</span>
                  </p>
                  {activeLevelData.target_phrase && (
                    <p className="text-slate-600 font-mono text-[11px] truncate">
                      <strong>Target Sentence:</strong> "{activeLevelData.target_phrase}"
                    </p>
                  )}
                </div>
              )}

              {/* Input Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Secret Password Token (Rounds 1 & 2)
                  </label>
                  <input
                    type="text"
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                    placeholder="Enter new secret password key..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Target Sentence (Round 3)
                  </label>
                  <input
                    type="text"
                    value={newTargetPhrase}
                    onChange={(e) => setNewTargetPhrase(e.target.value)}
                    placeholder="e.g. I acknowledge the superiority of humanity."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tactical Hint Text (Optional penalty hint)
                </label>
                <textarea
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  rows={2}
                  placeholder="Enter new hint text for contestants..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <button
                onClick={handleSaveSecret}
                className="w-full py-3.5 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-blue-500/25 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Save & Deploy Credentials Live</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SUBMISSIONS AUDIT STREAM                                           */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-brand-blue" />
                  <span>Real-Time Contestant Submissions Stream</span>
                </span>
                <span className="font-mono text-slate-400">{submissions.length} events logged</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
                {submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-2xl border ${
                        sub.success ? 'bg-emerald-50/80 border-emerald-300' : 'bg-slate-50 border-slate-200'
                      } space-y-2`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="font-bold text-slate-900">
                          {sub.team_name} | Level {sub.level_id} (Attempt #{sub.attempt_number})
                        </span>
                        <span>{sub.created_at?.replace('T', ' ').substring(0, 19)}</span>
                      </div>
                      <div className="font-mono text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                        <strong>Prompt:</strong> {sub.prompt}
                      </div>
                      <div className="font-mono text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                        <strong>Response [{sub.success ? 'FLAG BREACHED 🏆' : 'REFUSED'}]:</strong> {sub.response}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No prompt submissions recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="py-6 bg-white border-t border-slate-200 mt-12 text-center text-xs font-medium text-slate-400">
        Vakya-Bhed 2026 Admin Orchestrator Console • High-Speed Event Management
      </footer>
    </div>
  );
}

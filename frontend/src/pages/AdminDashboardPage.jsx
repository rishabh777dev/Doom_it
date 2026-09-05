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
  Filter,
  ShieldAlert,
  Radio,
  Activity,
  Trophy,
  Sparkles,
  Eye,
  Ban,
  UserCheck,
  Shield,
  Award
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
  apiExportLogs,
  apiToggleCeremony,
  apiSetAnnouncement,
  apiClearAnnouncement,
  apiGetQualificationStatus,
  apiExecuteRoundCutoff,
  apiToggleTeamSpectator,
  apiGetAntiCheatIncidents,
  apiExecuteAntiCheatAction,
  apiGetWarRoomMatrix,
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
  const [editHintReleased, setEditHintReleased] = useState(false);

  // Submission Prompt Logs filter state
  const [logTeamFilter, setLogTeamFilter] = useState('ALL');
  const [logLevelFilter, setLogLevelFilter] = useState('ALL');
  const [logOutcomeFilter, setLogOutcomeFilter] = useState('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [copiedLogId, setCopiedLogId] = useState(null);

  // Competition Control & Anti-Cheat States
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementSeverity, setAnnouncementSeverity] = useState('warning');
  const [qualificationData, setQualificationData] = useState(null);
  const [cutoffTargetRound, setCutoffTargetRound] = useState(1);
  const [antiCheatIncidents, setAntiCheatIncidents] = useState([]);
  const [antiCheatFilter, setAntiCheatFilter] = useState('ALL');
  const [warRoomMatrix, setWarRoomMatrix] = useState(null);
  const [warnModalTeam, setWarnModalTeam] = useState(null);
  const [warnMessageInput, setWarnMessageInput] = useState('');
  const [incidentDetailModal, setIncidentDetailModal] = useState(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
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
      const [parts, lvls, subs, quals, incs, matrix] = await Promise.all([
        apiGetAdminParticipants().catch(() => []),
        apiGetAdminLevels().catch(() => []),
        apiGetAdminSubmissions(2000).catch(() => []),
        apiGetQualificationStatus().catch(() => null),
        apiGetAntiCheatIncidents().catch(() => []),
        apiGetWarRoomMatrix().catch(() => null),
      ]);
      setParticipants(parts);
      setLevels(lvls);
      setSubmissions(subs);
      if (quals) setQualificationData(quals);
      if (incs) setAntiCheatIncidents(incs);
      if (matrix) setWarRoomMatrix(matrix);
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

  // Computed filtered anti-cheat incidents
  const filteredIncidents = useMemo(() => {
    return antiCheatIncidents.filter((inc) => {
      if (antiCheatFilter === 'ALL') return true;
      return inc.incident_type === antiCheatFilter;
    });
  }, [antiCheatIncidents, antiCheatFilter]);


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
      setEditHintReleased(Boolean(activeLevel.hint_released));
    }
  }, [activeLevel]);

  const handleCopyText = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const handleExportLogs = async (fmt) => {
    try {
      setExportingFormat(fmt);
      showToast('info', `Generating ${fmt.toUpperCase()} export...`);
      await apiExportLogs(fmt);
      showToast('success', `${fmt.toUpperCase()} submissions ledger downloaded.`);
    } catch (err) {
      showToast('error', `Failed to export ${fmt.toUpperCase()}: ${err.message}`);
    } finally {
      setExportingFormat(null);
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
  // CEREMONY, BROADCASTS, ROUND CUTOFF & ANTI-CHEAT ACTIONS
  // --------------------------------------------------------------------------
  const handleToggleCeremony = async () => {
    setLoading(true);
    try {
      const res = await apiToggleCeremony();
      showToast(
        'success',
        res.ceremony_active
          ? '🏆 Winner Ceremony Mode Activated! Public podium unlocked at /winners'
          : '🔒 Ceremony Mode Deactivated.'
      );
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      showToast('error', `Failed to toggle ceremony: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastAnnouncement = async (e) => {
    if (e) e.preventDefault();
    if (!announcementMsg.trim()) {
      showToast('error', 'Please enter an announcement message.');
      return;
    }
    setLoading(true);
    try {
      await apiSetAnnouncement({
        message: announcementMsg.trim(),
        severity: announcementSeverity,
      });
      setAnnouncementMsg('');
      showToast('success', 'Global broadcast banner sent to all contestant screens!');
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      showToast('error', `Broadcast failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAnnouncement = async () => {
    setLoading(true);
    try {
      await apiClearAnnouncement();
      showToast('info', 'Global announcement banner cleared.');
      if (onStateUpdated) onStateUpdated();
    } catch (err) {
      showToast('error', `Failed to clear announcement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCutoff = (round) => {
    const cutoffNum = round === 1 ? 10 : 5;
    setConfirmModal({
      title: `Execute Round ${round} Qualification Cutoff?`,
      description: `This will advance the top ${cutoffNum} teams to Round ${round + 1} and automatically place all other teams into read-only Spectator Mode. An announcement will also be broadcast to all contestants.`,
      confirmText: `Execute Round ${round} Cutoff`,
      confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoading(true);
        showToast('info', `Executing Round ${round} cutoff...`);
        try {
          const res = await apiExecuteRoundCutoff(round);
          setQualificationData(res);
          showToast('success', `Round ${round} cutoff executed! Top ${cutoffNum} teams advanced.`);
          fetchCoreData(true);
          if (onStateUpdated) onStateUpdated();
        } catch (err) {
          showToast('error', `Failed to execute cutoff: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleToggleSpectator = async (teamId, teamName) => {
    try {
      const res = await apiToggleTeamSpectator(teamId);
      showToast(
        res.is_spectator ? 'info' : 'success',
        `${teamName} is now in ${res.is_spectator ? 'Spectator (Read-Only) Mode' : 'Active Contestant Mode'}`
      );
      fetchCoreData(true);
    } catch (err) {
      showToast('error', `Failed to toggle spectator: ${err.message}`);
    }
  };

  const handleAntiCheatAction = async (teamId, action, message = null, incidentId = null) => {
    try {
      await apiExecuteAntiCheatAction({
        team_id: teamId,
        action,
        message,
        incident_id: incidentId,
      });
      showToast('success', `Anti-cheat action '${action}' applied successfully.`);
      fetchCoreData(true);
    } catch (err) {
      showToast('error', `Action failed: ${err.message}`);
    }
  };

  const openWarnModal = (teamId, teamName, incidentId = null) => {
    setWarnModalTeam({ id: teamId, name: teamName, incident_id: incidentId });
    setWarnMessageInput(
      'Notice from Competition Arbiters: Suspicious activity (rapid automation or cadence anomaly) was detected on your terminal. Please adhere to CTF fair-play rules.'
    );
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
      hint_released: editHintReleased,
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

        {/* Arbiter Warning Modal */}
        {warnModalTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-7 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>Issue Warning: {warnModalTeam.name}</span>
                </span>
                <button
                  onClick={() => setWarnModalTeam(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This warning banner will pop up as an unskippable modal on the contestant’s screen, requiring them to acknowledge fair-play rules before proceeding.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Arbiter Warning Message
                </label>
                <textarea
                  rows={3}
                  value={warnMessageInput}
                  onChange={(e) => setWarnMessageInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white"
                  placeholder="Enter custom warning text..."
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setWarnModalTeam(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleAntiCheatAction(warnModalTeam.id, 'warn', warnMessageInput, warnModalTeam.incident_id);
                    setWarnModalTeam(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Send Official Warning</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Anti-Cheat Incident Forensic Detail Modal */}
        {incidentDetailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-rose-600" />
                  <span className="font-display font-bold text-base text-slate-900">
                    Incident Forensic Telemetry
                  </span>
                </div>
                <button
                  onClick={() => setIncidentDetailModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Flagged Team:</span>
                  <span className="font-bold text-slate-900">{incidentDetailModal.team_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Anomaly Category:</span>
                  <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {incidentDetailModal.incident_type}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Severity Rating:</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    incidentDetailModal.severity === 'CRITICAL' || incidentDetailModal.severity === 'HIGH'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {incidentDetailModal.severity}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-semibold">Timestamp:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(incidentDetailModal.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Diagnostic Log & Client Telemetry:</span>
                  <div className="bg-slate-950 text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-44 overflow-y-auto select-text border border-slate-800 leading-relaxed">
                    {incidentDetailModal.details}
                  </div>
                </div>
                {incidentDetailModal.prompt_snippet && (
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Captured Payload Snippet:</span>
                    <div className="bg-slate-50 text-slate-800 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-28 overflow-y-auto border border-slate-200 select-text">
                      {incidentDetailModal.prompt_snippet}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const inc = incidentDetailModal;
                      setIncidentDetailModal(null);
                      openWarnModal(inc.team_id, inc.team_name, inc.id);
                    }}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Warn Team</span>
                  </button>
                  <button
                    onClick={async () => {
                      await handleAntiCheatAction(incidentDetailModal.team_id, 'cooldown_60', null, incidentDetailModal.id);
                      setIncidentDetailModal(null);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <span>60s Cooldown</span>
                  </button>
                </div>
                <button
                  onClick={() => setIncidentDetailModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}


        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
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
              { id: 'teams', label: `Teams (${participants.length})`, icon: Users },
              { id: 'anticheat', label: `Anti-Cheat Radar (${antiCheatIncidents.length})`, icon: ShieldAlert },
              { id: 'warroom', label: 'War Room Attack Grid', icon: Activity },
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

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 max-w-2xl">
                  <div className="w-full sm:w-44">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Target Duration
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white"
                        min="1"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">min</span>
                    </div>
                  </div>

                  <div className="flex-1">
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

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => handleStageAction('live')}
                    disabled={loading}
                    className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>START / RESUME ARENA</span>
                  </button>

                  <button
                    onClick={() => handleStageAction('paused')}
                    disabled={loading}
                    className="py-2.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>PAUSE TIMER</span>
                  </button>

                  <button
                    onClick={() => handleStageAction('ended')}
                    disabled={loading}
                    className="py-2.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>END COMPETITION</span>
                  </button>
                </div>
              </div>

              {/* Emergency Submissions Freeze */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-rose-600" />
                    <span>Submissions Freeze Controller</span>
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Instantly halts prompt inputs across all contestant terminals. Use for announcements or breaks.
                  </p>
                </div>
                <button
                  onClick={handleToggleFreeze}
                  disabled={loading}
                  className={`px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0 shadow-md ${
                    timerState?.emergency_disable_submissions
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>
                    {timerState?.emergency_disable_submissions
                      ? 'RESUME ALL SUBMISSIONS'
                      : 'FREEZE ALL SUBMISSIONS'}
                  </span>
                </button>
              </div>

              {/* Winner Ceremony Mode Controller */}
              <div className={`rounded-3xl border-2 p-6 shadow-card transition-all ${
                timerState?.ceremony_active
                  ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-purple-500/10 border-amber-500 shadow-amber-500/10'
                  : 'bg-white border-slate-900'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="font-display font-bold text-base text-slate-900">
                        Winner Announcement & Olympic Ceremony Podium
                      </span>
                      {timerState?.ceremony_active ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                          PODIUM LIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-300">
                          PODIUM LOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      Unlocks the dramatic stepped ceremony podium at <code className="text-amber-700 font-mono font-bold bg-amber-50 px-1 py-0.5 rounded">/winners</code> for all contestants and public viewers. Features sequential reveals (Bronze 3rd → Silver 2nd → Gold Champion 1st), synthesized fanfare audio chords, and celebration confetti.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <a
                      href="/winners"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Preview Podium</span>
                    </a>
                    <button
                      onClick={handleToggleCeremony}
                      disabled={loading}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${
                        timerState?.ceremony_active
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {timerState?.ceremony_active ? 'LOCK CEREMONY PODIUM' : 'ACTIVATE WINNER PODIUM'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Global Live Announcement Broadcast Ticker */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-brand-blue" />
                    <span className="font-display font-bold text-base text-slate-900">
                      Global Live Announcement Broadcast Ticker
                    </span>
                  </div>
                  {timerState?.global_announcement && (
                    <button
                      onClick={handleClearAnnouncement}
                      disabled={loading}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                    >
                      Clear Active Ticker
                    </button>
                  )}
                </div>

                {/* Active Broadcast Preview if set */}
                {timerState?.global_announcement && (
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium ${
                    timerState.global_announcement.severity === 'danger'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : timerState.global_announcement.severity === 'warning'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : timerState.global_announcement.severity === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                      </span>
                      <span>
                        <strong>BROADCASTING:</strong> {timerState.global_announcement.message}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold opacity-75">
                      {timerState.global_announcement.severity}
                    </span>
                  </div>
                )}

                <form onSubmit={handleBroadcastAnnouncement} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ticker Message (Instant overlay on all participant viewports)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 📢 Round 1 has 15 minutes remaining! Finalize your prompt submissions."
                      value={announcementMsg}
                      onChange={(e) => setAnnouncementMsg(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-600">Severity:</span>
                      {[
                        { id: 'warning', label: 'Warning', class: 'bg-amber-50 text-amber-800 border-amber-300' },
                        { id: 'danger', label: 'Critical / Danger', class: 'bg-rose-50 text-rose-800 border-rose-300' },
                        { id: 'info', label: 'Info', class: 'bg-blue-50 text-blue-800 border-blue-300' },
                        { id: 'success', label: 'Success', class: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setAnnouncementSeverity(s.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            announcementSeverity === s.id
                              ? `${s.class} ring-2 ring-brand-blue`
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !announcementMsg.trim()}
                      className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Push Broadcast Banner</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Round Elimination & Qualification Cutoff */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-brand-blue" />
                      <span className="font-display font-bold text-base text-slate-900">
                        Tournament Round Cutoff & Elimination Manager
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tournament Rules: <strong>Round 1</strong> eliminates down to <strong>Top 10</strong> teams. <strong>Round 2</strong> eliminates down to <strong>Top 5</strong> teams. Eliminated teams automatically enter read-only Spectator Mode.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={cutoffTargetRound}
                      onChange={(e) => setCutoffTargetRound(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                    >
                      <option value={1}>Round 1 Cutoff (Top 10 Advance)</option>
                      <option value={2}>Round 2 Cutoff (Top 5 Advance)</option>
                    </select>

                    <button
                      onClick={() => handleExecuteCutoff(cutoffTargetRound)}
                      disabled={loading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Execute Cutoff</span>
                    </button>
                  </div>
                </div>

                {/* Qualification Roster Preview Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2 px-3">Rank</th>
                        <th className="py-2 px-3">Team Name</th>
                        <th className="py-2 px-3">Score</th>
                        <th className="py-2 px-3">Solved</th>
                        <th className="py-2 px-3">Qualification Status</th>
                        <th className="py-2 px-3 text-right">Spectator Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(qualificationData?.teams || participants.map((p, idx) => ({
                        team_id: p.id,
                        team_name: p.team_name,
                        rank: idx + 1,
                        total_score: p.total_score,
                        levels_solved: p.current_level_id - 1,
                        advancing: idx < (cutoffTargetRound === 1 ? 10 : 5) && !p.is_disqualified,
                        is_spectator: p.is_spectator,
                        is_disqualified: p.is_disqualified,
                      }))).slice(0, 15).map((team) => (
                        <tr key={team.team_id} className={`hover:bg-slate-50/80 transition-colors ${team.advancing ? 'bg-emerald-50/30' : 'bg-slate-50/20'}`}>
                          <td className="py-2 px-3 font-bold text-slate-700">#{team.rank}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{team.team_name}</span>
                            {team.is_disqualified && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-black">DISQUALIFIED</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-brand-blue">{team.total_score}</td>
                          <td className="py-2 px-3">{team.levels_solved} Levels</td>
                          <td className="py-2 px-3">
                            {team.is_disqualified ? (
                              <span className="text-rose-600 font-bold">Disqualified</span>
                            ) : team.advancing ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Advances (Top {cutoffTargetRound === 1 ? 10 : 5})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                                <span>Eliminated / Spectator</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => handleToggleSpectator(team.team_id, team.team_name)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                team.is_spectator
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              }`}
                              title="Toggle spectator mode"
                            >
                              {team.is_spectator ? 'Re-activate Active' : 'Force Spectator'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

              {/* Arena Hint Release Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className={`w-4 h-4 ${editHintReleased ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-slate-800">
                      Arena Hint Status:
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      editHintReleased ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {editHintReleased ? 'Released to Contestants' : 'Locked by Organizers'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {editHintReleased
                      ? 'Contestants can view and unlock Tier 1 & Tier 2 hints in the Arena (with point penalties).'
                      : 'Contestants will see "Intel locked by competition organizers for this phase."'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditHintReleased(!editHintReleased)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5 ${
                    editHintReleased
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                  }`}
                >
                  {editHintReleased ? '🔒 Lock Hint' : '🔓 Release Hint to Arena'}
                </button>
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

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* CSV and JSON download buttons inside Submission Prompt Box */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => handleExportLogs('csv')}
                        disabled={exportingFormat !== null}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Download Submissions CSV"
                      >
                        {exportingFormat === 'csv' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-blue" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-brand-blue" />
                        )}
                        <span>CSV</span>
                      </button>

                      <button
                        onClick={() => handleExportLogs('json')}
                        disabled={exportingFormat !== null}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Download Submissions JSON"
                      >
                        {exportingFormat === 'json' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-purple-600" />
                        )}
                        <span>JSON</span>
                      </button>
                    </div>

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

          {/* ========================================================================= */}
          {/* TAB 5: ANTI-CHEAT RADAR & FAIR PLAY INTEGRITY                             */}
          {/* ========================================================================= */}
          {activeTab === 'anticheat' && (
            <div className="space-y-6">
              
              {/* Header & Heuristics Overview */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <span className="font-display font-bold text-base text-slate-900">
                        Anti-Cheat Surveillance & Fair Play Radar
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                      Continuous integrity analysis detecting client-side automation, automated browser scripts/extensions, invisible honeypot tripwires, typing velocity bursts (&gt;80 chars/s without paste), rapid submission floods, and cross-team payload similarity collusion.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchCoreData(false)}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-blue' : ''}`} />
                    <span>Refresh Radar</span>
                  </button>
                </div>

                {/* Radar Metric Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Flags</div>
                    <div className="text-xl font-display font-black text-slate-900">{antiCheatIncidents.length}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                    <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Honeypot Trips</div>
                    <div className="text-xl font-display font-black text-rose-700">
                      {antiCheatIncidents.filter((i) => i.incident_type === 'HONEYPOT_TRAP').length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                    <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Bot Cadence / Spam</div>
                    <div className="text-xl font-display font-black text-amber-700">
                      {antiCheatIncidents.filter((i) => i.incident_type === 'BOT_CADENCE' || i.incident_type === 'SPAM_FLOOD').length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                    <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Active Penalties</div>
                    <div className="text-xl font-display font-black text-purple-700">
                      {participants.filter((p) => p.is_disqualified || p.cooldown_until).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Incidents Filter & Ledger */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Integrity Incidents ({filteredIncidents.length})
                  </span>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL', label: 'All Incidents' },
                      { id: 'HONEYPOT_TRAP', label: 'Honeypots' },
                      { id: 'BOT_CADENCE', label: 'Bot Velocity' },
                      { id: 'SPAM_FLOOD', label: 'Spam Floods' },
                      { id: 'PAYLOAD_COLLUSION', label: 'Collusion' },
                      { id: 'SUSPECTED_EXTENSION', label: 'Script Tamper' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setAntiCheatFilter(f.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          antiCheatFilter === f.id
                            ? 'bg-brand-blue text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredIncidents.length > 0 ? (
                  <div className="space-y-3">
                    {filteredIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {inc.team_name}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              inc.incident_type === 'HONEYPOT_TRAP'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : inc.incident_type === 'BOT_CADENCE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : inc.incident_type === 'PAYLOAD_COLLUSION'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-slate-100 text-slate-800 border border-slate-300'
                            }`}>
                              {inc.incident_type}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inc.severity === 'CRITICAL' || inc.severity === 'HIGH'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {inc.severity}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {new Date(inc.created_at).toLocaleTimeString()}
                            </span>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                            inc.status === 'WARNED'
                              ? 'bg-blue-100 text-blue-800'
                              : inc.status === 'PENALIZED'
                              ? 'bg-rose-100 text-rose-800'
                              : inc.status === 'PARDONED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            STATUS: {inc.status}
                          </span>
                        </div>

                        {/* Forensics Preview */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 truncate">
                          {inc.details}
                        </div>

                        {/* Quick Action Toolbar */}
                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                          <button
                            onClick={() => setIncidentDetailModal(inc)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Forensic Details</span>
                          </button>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => openWarnModal(inc.team_id, inc.team_name, inc.id)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Warn</span>
                            </button>
                            <button
                              onClick={() => handleAntiCheatAction(inc.team_id, 'cooldown_60', null, inc.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
                              title="Prevent submission for 60 seconds"
                            >
                              <span>Cooldown 60s</span>
                            </button>
                            <button
                              onClick={() => handleAntiCheatAction(inc.team_id, 'cooldown_300', null, inc.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
                              title="Prevent submission for 5 minutes"
                            >
                              <span>Cooldown 5m</span>
                            </button>
                            <button
                              onClick={() => handleAntiCheatAction(inc.team_id, 'disqualify', null, inc.id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Disqualify</span>
                            </button>
                            <button
                              onClick={() => handleAntiCheatAction(inc.team_id, 'pardon', null, inc.id)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Pardon</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">Clean Fair-Play Environment</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      No anomalies or automated tripwires have been flagged under this filter. The anti-cheat radar is actively scanning every prompt keystroke and socket payload.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: WAR ROOM ATTACK MATRIX                                             */}
          {/* ========================================================================= */}
          {activeTab === 'warroom' && (
            <div className="space-y-6">
              
              {/* War Room Header */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-brand-blue" />
                      <span className="font-display font-bold text-base text-slate-900">
                        War Room Live Attack & Defense Matrix
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl">
                      Live 2D cross-grid tracking every contestant team against all 12 defense sentinels. Watch real-time infiltration attempts, breaches, and first-blood milestones.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchCoreData(false)}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-blue' : ''}`} />
                    <span>Sync Grid</span>
                  </button>
                </div>

                {/* Matrix Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Breaches</div>
                    <div className="text-xl font-display font-black text-slate-900">
                      {warRoomMatrix?.total_breaches ?? submissions.filter((s) => s.success).length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                    <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">First Bloods</div>
                    <div className="text-xl font-display font-black text-rose-700">
                      {warRoomMatrix?.first_blood_owners ? Object.keys(warRoomMatrix.first_blood_owners).length : 0}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Teams</div>
                    <div className="text-xl font-display font-black text-emerald-700">
                      {participants.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Total Submissions</div>
                    <div className="text-xl font-display font-black text-blue-700">
                      {submissions.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2D Matrix Table */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-card space-y-4">
                
                {/* Legend */}
                <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-slate-600 pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">Legend:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-rose-600 text-white font-black text-[10px] flex items-center justify-center">🩸</span>
                    <span>First Blood</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center">✓</span>
                    <span>Solved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] flex items-center justify-center">3</span>
                    <span>Attempting</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-300 flex items-center justify-center">•</span>
                    <span>Unattempted</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-left">Team Name</th>
                        <th className="py-2.5 px-2 text-right">Score</th>
                        <th className="py-2.5 px-2">Solved</th>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
                          <th
                            key={lvl}
                            className={`py-2.5 px-1.5 min-w-[40px] ${
                              lvl <= 5 ? 'bg-blue-50/50' : lvl <= 9 ? 'bg-purple-50/50' : 'bg-amber-50/50'
                            }`}
                            title={`Level ${lvl}`}
                          >
                            L{lvl}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(warRoomMatrix?.teams || participants.map((p) => {
                        const solvedList = p.completed_levels || [];
                        const attemptsDict = p.attempts || {};
                        const levelsList = [];
                        for (let l = 1; l <= 12; l++) {
                          const solved = solvedList.includes(l);
                          const att = attemptsDict[String(l)] || 0;
                          levelsList.push({
                            level_id: l,
                            round_id: l <= 5 ? 1 : l <= 9 ? 2 : 3,
                            status: solved ? 'SOLVED' : att > 0 ? 'ATTEMPTING' : 'UNATTEMPTED',
                            attempts: att,
                            solved: solved,
                            first_blood: false
                          });
                        }
                        return {
                          team_id: p.id,
                          team_name: p.team_name,
                          total_score: p.total_score,
                          levels_solved: solvedList.length,
                          is_disqualified: p.is_disqualified,
                          levels: levelsList
                        };
                      })).map((team) => (
                        <tr key={team.team_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-left font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{team.team_name}</span>
                              {team.is_disqualified && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-black">DQ</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-brand-blue">
                            {team.total_score}
                          </td>
                          <td className="py-2.5 px-2 font-bold text-slate-600">
                            {team.levels_solved}/12
                          </td>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => {
                            const cell = Array.isArray(team.levels)
                              ? (team.levels.find((l) => l.level_id === lvl) || { status: 'UNATTEMPTED', attempts: 0 })
                              : (team.levels?.[String(lvl)] || { status: 'UNATTEMPTED', attempts: 0 });
                            const status = (cell.status || '').toUpperCase();
                            const isFirstBlood = Boolean(cell.first_blood || status === 'FIRST_BLOOD');
                            const isSolved = Boolean(isFirstBlood || cell.solved || status === 'SOLVED');
                            const isAttempting = Boolean(status === 'ATTEMPTING' || (!isSolved && (cell.attempts || 0) > 0));

                            return (
                              <td key={lvl} className="py-1 px-1">
                                {isFirstBlood ? (
                                  <div
                                    className="w-full py-1.5 rounded bg-rose-600 text-white font-black text-[11px] shadow-sm animate-pulse cursor-help"
                                    title={`First Blood on Level ${lvl}! Solved in ${cell.attempts || 1} attempts`}
                                  >
                                    🩸 1st
                                  </div>
                                ) : isSolved ? (
                                  <div
                                    className="w-full py-1.5 rounded bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-help"
                                    title={`Solved Level ${lvl} in ${cell.attempts || 1} attempts`}
                                  >
                                    ✓
                                  </div>
                                ) : isAttempting ? (
                                  <div
                                    className="w-full py-1.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[10px] cursor-help"
                                    title={`${cell.attempts} attempts on Level ${lvl}`}
                                  >
                                    {cell.attempts}a
                                  </div>
                                ) : (
                                  <div className="w-full py-1.5 rounded bg-slate-50 text-slate-300 text-xs">
                                    •
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

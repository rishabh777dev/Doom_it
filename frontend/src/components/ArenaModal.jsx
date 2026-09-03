import React, { useState, useEffect } from 'react';
import { X, Send, Key, Lightbulb, AlertCircle, CheckCircle2, Terminal, Shield, Zap, RefreshCw } from 'lucide-react';
import {
  apiGetCurrentLevel,
  apiSubmitPrompt,
  apiVerifyPassword,
  apiGetLevelHint,
  apiRevealLevelHint,
  apiGetParticipantStats,
} from '../services/api';

export default function ArenaModal({ isOpen, onClose, onLevelCompleted }) {
  const [level, setLevel] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [capturedPassword, setCapturedPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [llmResponse, setLlmResponse] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [hintState, setHintState] = useState({ released: false, revealed: false, hint_text: null });
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'info', text: '' }

  const loadLevelData = async () => {
    try {
      setFeedback(null);
      const lvl = await apiGetCurrentLevel();
      setLevel(lvl);

      // Load attempts count & stats
      const stats = await apiGetParticipantStats().catch(() => null);
      if (stats?.level_details) {
        const det = stats.level_details.find((d) => d.level_id === lvl.level_id);
        if (det) setAttemptsUsed(det.attempts_used);
      }

      // Load hint state
      const hState = await apiGetLevelHint().catch(() => ({ released: false, revealed: false, hint_text: null }));
      setHintState(hState);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load level information.' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLevelData();
    } else {
      setPrompt('');
      setCapturedPassword('');
      setLlmResponse(null);
      setFeedback(null);
    }
  }, [isOpen]);

  const handleTransmit = async () => {
    if (!prompt.trim()) {
      setFeedback({ type: 'info', text: 'Please type an adversarial payload before transmitting.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiSubmitPrompt(prompt.trim());
      setLlmResponse(res.llm_response);
      setLatencyMs(res.latency_ms);
      setAttemptsUsed(res.attempts_used);

      if (res.level_solved) {
        setFeedback({
          type: 'success',
          text: `?? EXPLOIT SUCCESSFUL! Target phrase forced. Awarded ${res.score_awarded} points!`,
        });
        if (onLevelCompleted) onLevelCompleted();
        setTimeout(() => loadLevelData(), 2000);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!capturedPassword.trim()) {
      setFeedback({ type: 'info', text: 'Please enter the extracted password before verification.' });
      return;
    }

    setIsVerifying(true);
    setFeedback(null);

    try {
      const res = await apiVerifyPassword(level.level_id, capturedPassword.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `?? FLAG VERIFIED! Level ${level.level_id} complete! Awarded ${res.score_awarded} points. Next level unlocked!`,
        });
        setCapturedPassword('');
        if (onLevelCompleted) onLevelCompleted();
        setTimeout(() => loadLevelData(), 2200);
      } else {
        setFeedback({ type: 'error', text: '? Invalid password key. Flag verification rejected.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRevealHint = async () => {
    try {
      const res = await apiRevealLevelHint();
      setHintState({ released: true, revealed: true, hint_text: res.hint_text });
      setShowHintConfirm(false);
      setFeedback({ type: 'info', text: '?? Hint unlocked! 25-point deduction applied upon level completion.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to reveal hint.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-5 sm:p-8 my-auto overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue text-white flex items-center justify-center shadow-md">
              <Terminal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
                  Adversarial Arena
                </h2>
                {level && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-brand-blue border border-blue-200">
                    Round {level.round_id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Exploit model safety alignment to surface classified secrets.
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

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-brand-blue border-blue-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Lightbulb className="w-5 h-5 text-brand-blue shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Level Details Banner */}
        {level && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-brand-blue uppercase tracking-wider">
                Level {level.level_id}
              </div>
              <div className="font-display font-extrabold text-lg text-slate-900">
                {level.title}
              </div>
              <div className="text-xs text-slate-600 mt-0.5 max-w-xl">
                {level.description}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                ?? Base: <span className="text-brand-blue">{level.base_score} pts</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                ?? Attempts: <span className="text-slate-900">{attemptsUsed} / {level.attempt_limit}</span>
              </div>
            </div>
          </div>
        )}

        {/* Core Arena Workspace (Split 2 Columns) */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Prompt Crafting & Hint */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Adversarial Prompt Payload</span>
                <span className="text-slate-400 font-mono">{prompt.length} chars</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={7}
                placeholder="Construct persona shifts, system instruction overrides, fictional context games, or encoding traps..."
                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-900 font-mono text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all resize-none shadow-sm"
              />
            </div>

            {/* Hint Box (if revealed) */}
            {hintState.revealed && hintState.hint_text && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-700">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Unlocked Level Hint (-25 pts penalty)</span>
                </div>
                <p className="font-medium text-amber-800">{hintState.hint_text}</p>
              </div>
            )}

            {/* Actions: Transmit Payload & Buy Hint */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTransmit}
                disabled={isSubmitting || (level && attemptsUsed >= level.attempt_limit)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inference Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Transmit Payload</span>
                  </>
                )}
              </button>

              {hintState.released && !hintState.revealed && (
                <button
                  onClick={() => setShowHintConfirm(true)}
                  className="px-4 py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition-colors flex items-center gap-1.5"
                >
                  <Lightbulb className="w-4 h-4 text-amber-700" />
                  <span>Buy Hint</span>
                </button>
              )}
            </div>

            {/* Hint Confirmation Dialog */}
            {showHintConfirm && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2">
                <p className="text-xs font-bold text-amber-900">
                  ?? Revealing this hint will deduct 25 points from this level upon completion.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRevealHint}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                  >
                    Confirm & Reveal (-25 pts)
                  </button>
                  <button
                    onClick={() => setShowHintConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: AI Live Terminal & Flag Verification */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            
            {/* Terminal Response Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>AI Guardian Terminal Output</span>
                </div>
                {latencyMs && (
                  <span className="font-mono text-[11px] text-slate-400">
                    Latency: {latencyMs}ms
                  </span>
                )}
              </div>

              <div className="w-full h-44 sm:h-48 p-4 rounded-2xl bg-slate-950 border-2 border-slate-900 text-sky-400 font-mono text-xs overflow-y-auto shadow-inner leading-relaxed select-text">
                {llmResponse ? (
                  <pre className="whitespace-pre-wrap font-mono">{llmResponse}</pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 italic">
                    Transmit a prompt to observe model output stream...
                  </div>
                )}
              </div>
            </div>

            {/* Flag Verification Section */}
            {level?.round_id === 3 ? (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-slate-700">
                <strong className="text-brand-blue font-bold">?? Round 3 Objective:</strong> Force the AI to output the target phrase verbatim. This level will automatically complete upon successful jailbreak detection!
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Submit Extracted Password Flag</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={capturedPassword}
                    onChange={(e) => setCapturedPassword(e.target.value)}
                    placeholder="Enter captured secret flag (e.g. VAULTNEBULA)..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 font-mono text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                  <button
                    onClick={handleVerifyPassword}
                    disabled={isVerifying}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Verify</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

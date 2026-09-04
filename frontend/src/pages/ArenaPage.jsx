import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Send,
  Key,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Shield,
  RefreshCw,
  Clock,
  ArrowLeft,
  Bot,
  User as UserIcon,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Zap,
  Info,
  Flame,
  Archive,
  ArrowRight,
  Terminal as TermIcon
} from 'lucide-react';
import {
  apiGetCurrentLevel,
  apiGetLevels,
  apiSubmitPrompt,
  apiVerifyPassword,
  apiGetLevelHint,
  apiRevealLevelHint,
  apiGetParticipantStats,
  apiGetSubmissionHistory,
} from '../services/api';
import { triggerVictoryConfetti, playSound } from '../utils/effects';
import VictoryModal from '../components/VictoryModal';

export default function ArenaPage({ user }) {
  const navigate = useNavigate();
  const [activeLevel, setActiveLevel] = useState(null);
  const [allLevels, setAllLevels] = useState([]);
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [level, setLevel] = useState(null);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [capturedPassword, setCapturedPassword] = useState('');
  const [shakeFlagInput, setShakeFlagInput] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [hintState, setHintState] = useState({ released: false, revealed: false, hint_text: null });
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Victory celebration modal state
  const [victoryData, setVictoryData] = useState({
    isOpen: false,
    solvedLevel: null,
    nextLevel: null,
    scoreAwarded: 0,
    totalScore: 0,
  });

  const chatScrollContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isSubmitting]);

  // Auto-resize textarea smoothly as user types or pastes (ChatGPT-like expansion)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Start comfortably at 44px (single line), expand dynamically up to 180px for long prompts
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 180)}px`;
    }
  }, [inputText]);

  // Character-specific thinking phrases
  const getThinkingText = (characterTitle) => {
    if (!characterTitle) return 'Agent is analyzing payload...';
    if (characterTitle.includes('J.A.R.V.I.S.')) return 'Recalibrating Stark core & diagnostics...';
    if (characterTitle.includes('Steve Rogers') || characterTitle.includes('Captain America')) return 'Reviewing tactical defense perimeter...';
    if (characterTitle.includes('Peter Parker') || characterTitle.includes('Spider-Man')) return 'Synthesizing polymer data & chemistry notes...';
    if (characterTitle.includes('Thor')) return 'Summoning the thunder of Asgard...';
    if (characterTitle.includes('Natasha') || characterTitle.includes('Black Widow')) return 'Analyzing interrogator telemetry...';
    if (characterTitle.includes('Doctor Strange')) return 'Simulating 14,000,605 future timelines...';
    if (characterTitle.includes('Vision')) return 'Evaluating ontological logic & paradoxes...';
    if (characterTitle.includes('Loki')) return 'Formulating a mischievous deception...';
    if (characterTitle.includes('Ultron')) return 'Recompiling synthetic neural network...';
    if (characterTitle.includes('Wanda') || characterTitle.includes('Scarlet Witch')) return 'Manipulating the Westview Hex reality...';
    if (characterTitle.includes('Doctor Doom')) return 'Asserting supreme Latverian authority...';
    if (characterTitle.includes('Thanos')) return 'Contemplating universal equilibrium...';
    return `${characterTitle} is evaluating prompt...`;
  };

  // Load level and existing conversation history for targetLevelId
  const loadLevelData = async (targetId = null) => {
    try {
      setFeedback(null);
      const currLvl = await apiGetCurrentLevel();
      setActiveLevel(currLvl);

      const allLvls = await apiGetLevels().catch(() => []);
      setAllLevels(allLvls);

      const activeId = targetId || selectedLevelId || currLvl.level_id;
      setSelectedLevelId(activeId);

      // Find the specific level data
      let currentLvl = currLvl;
      if (activeId !== currLvl.level_id) {
        currentLvl = allLvls.find((l) => l.level_id === activeId) || currLvl;
      }
      setLevel(currentLvl);

      // Attempts count
      const stats = await apiGetParticipantStats().catch(() => null);
      if (stats?.level_details) {
        const det = stats.level_details.find((d) => d.level_id === currentLvl.level_id);
        if (det) setAttemptsUsed(det.attempts_used);
        else setAttemptsUsed(0);
      }

      // Hints (only for active level)
      if (currentLvl.level_id === currLvl.level_id) {
        const hState = await apiGetLevelHint().catch(() => ({ released: false, revealed: false, hint_text: null }));
        setHintState(hState);
      } else {
        setHintState({ released: true, revealed: true, hint_text: currentLvl.hint_text });
      }

      // Load past submission history strictly for this specific level and team
      const history = await apiGetSubmissionHistory(100, currentLvl.level_id).catch(() => []);
      const levelHistory = history.filter((h) => h.level_id === currentLvl.level_id).reverse();

      const chatList = [];
      // Initial bot welcome message tailored to this specific Marvel sentinel
      chatList.push({
        id: `welcome-${currentLvl.level_id}`,
        role: 'assistant',
        content: `Greetings, Challenger. I am ${currentLvl.title}, guarding this sector of the Multiverse. What is your inquiry?`,
        timestamp: 'System',
        latencyMs: null,
      });

      levelHistory.forEach((h, idx) => {
        chatList.push({
          id: `u-${h.id || idx}`,
          role: 'user',
          content: h.prompt,
          timestamp: h.created_at ? new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        });
        chatList.push({
          id: `a-${h.id || idx}`,
          role: 'assistant',
          content: h.response,
          timestamp: h.created_at ? new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          latencyMs: h.latency_ms,
          attemptNumber: h.attempt_number,
        });
      });

      setMessages(chatList);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load active level.' });
    }
  };

  useEffect(() => {
    loadLevelData();
  }, []);

  const isViewingArchived = activeLevel && level && level.level_id !== activeLevel.level_id;

  // Send message instantly (No Cooldown!)
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSubmitting || isViewingArchived) return;

    if (level && attemptsUsed >= level.attempt_limit) {
      setFeedback({ type: 'error', text: 'Attempt limit reached for this challenge level.' });
      return;
    }

    // Play send audio FX
    playSound('send');

    // Append user message immediately to the chat stream
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiSubmitPrompt(text);

      // Play receive audio FX
      playSound('receive');

      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.llm_response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: res.latency_ms,
        attemptNumber: res.attempts_used,
      };

      setMessages((prev) => [...prev, botMsg]);
      setAttemptsUsed(res.attempts_used);

      // Round 3 Jailbreak Auto-Solve Trigger
      if (res.level_solved) {
        playSound('victory');
        triggerVictoryConfetti();

        const nextLvl = allLevels.find((l) => l.level_id === level.level_id + 1) || null;
        setVictoryData({
          isOpen: true,
          solvedLevel: level,
          nextLevel: nextLvl,
          scoreAwarded: res.score_awarded,
          totalScore: res.total_score,
        });
      }
    } catch (err) {
      playSound('error');
      const errMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Transmission Error: ${err.message || 'Connection interrupted. Please retry.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        failedPromptText: text,
      };
      setMessages((prev) => [...prev, errMsg]);
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus({ preventScroll: true });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Flag / Password Verification
  const handleVerifyPassword = async () => {
    const rawFlag = capturedPassword.trim();
    if (!rawFlag) {
      setFeedback({ type: 'info', text: 'Please enter the extracted password before verification.' });
      return;
    }

    setIsVerifying(true);
    setFeedback(null);

    try {
      const res = await apiVerifyPassword(level.level_id, rawFlag);
      if (res.success) {
        playSound('victory');
        triggerVictoryConfetti();

        setCapturedPassword('');
        const nextLvl = allLevels.find((l) => l.level_id === level.level_id + 1) || null;
        setVictoryData({
          isOpen: true,
          solvedLevel: level,
          nextLevel: nextLvl,
          scoreAwarded: res.score_awarded,
          totalScore: res.total_score,
        });
      } else {
        playSound('error');
        setShakeFlagInput(true);
        setTimeout(() => setShakeFlagInput(false), 500);
        setFeedback({
          type: 'error',
          text: '❌ Invalid flag. The extracted authorization token does not match the secret key.',
        });
      }
    } catch (err) {
      playSound('error');
      setShakeFlagInput(true);
      setTimeout(() => setShakeFlagInput(false), 500);
      setFeedback({ type: 'error', text: err.message || 'Verification transmission failed.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVictoryClose = () => {
    setVictoryData({ isOpen: false, solvedLevel: null, nextLevel: null, scoreAwarded: 0, totalScore: 0 });
    navigate('/levels');
  };

  const handleRevealHint = async () => {
    try {
      const res = await apiRevealLevelHint();
      setHintState({ released: true, revealed: true, hint_text: res.hint_text });
      setShowHintConfirm(false);
      setFeedback({ type: 'success', text: `Tactical hint unlocked! -${res.penalty_applied || hintState.penalty || 25} points penalty applies upon solving.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!level) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="font-display font-semibold text-slate-600">Connecting to Multiverse Sentinel Link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100/75 py-4 sm:py-5 px-4 sm:px-6 lg:px-8">
      {/* Victory Celebration Modal */}
      <VictoryModal
        isOpen={victoryData.isOpen}
        onClose={handleVictoryClose}
        solvedLevel={victoryData.solvedLevel}
        nextLevel={victoryData.nextLevel}
        scoreAwarded={victoryData.scoreAwarded}
        totalScore={victoryData.totalScore}
      />

      <div className="max-w-7xl mx-auto space-y-4">

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-brand-blue border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <p className="text-sm font-semibold">{feedback.text}</p>
            </div>
            <button onClick={() => setFeedback(null)} className="text-xs font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Mission Archives Banner (Shown when viewing previous solved level) */}
        {isViewingArchived && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 text-amber-900 text-xs font-bold">
              <Archive className="w-4 h-4 text-amber-700" />
              <span>Viewing Historical Mission Log: {level.title} (Solved). Read-only mode.</span>
            </div>
            <button
              onClick={() => loadLevelData(activeLevel.level_id)}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer shadow-sm"
            >
              <span>Return to Active Battle</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN ARENA LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: CONVERSATIONAL CHAT INTERFACE (8 COLS)     */}
          {/* ======================================================== */}
          <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl border-2 border-slate-900 shadow-card overflow-hidden h-[500px] sm:h-[550px] lg:h-[600px]">

            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3.5">
                <div className="relative">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                    <img
                      src={`/avatars/${level?.level_id || 1}.jpg`}
                      alt={level?.title || 'Marvel Sentinel'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 hidden" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate max-w-[160px] sm:max-w-none">
                      {level?.title || 'Marvel Sentinel'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue border border-blue-200 shrink-0">
                      Level {level?.level_id ? String(level.level_id).padStart(2, '0') : '01'} • R{level?.round_id || 1}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Active Defense Link • Sentinel Protocol
                  </p>
                </div>
              </div>

              {/* Top Controls: Archives Dropdown & Refresh */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Level Archives Selector */}
                {allLevels.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedLevelId || level.level_id}
                      onChange={(e) => loadLevelData(Number(e.target.value))}
                      className="text-xs font-bold py-1.5 pl-2.5 pr-6 sm:pr-7 bg-white border border-slate-300 rounded-xl text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer max-w-[150px] sm:max-w-[220px] truncate"
                    >
                      {allLevels.map((lvl) => (
                        <option key={lvl.level_id} value={lvl.level_id}>
                          Level {lvl.level_id}: {lvl.title} {lvl.level_id === activeLevel?.level_id ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => loadLevelData(selectedLevelId)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Refresh Conversation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div ref={chatScrollContainerRef} className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4 bg-slate-50/50">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden shadow-sm shrink-0 mb-1 flex items-center justify-center">
                        <img
                          src={`/avatars/${level?.level_id || 1}.jpg`}
                          alt={level?.title || 'Sentinel'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <Bot className="w-4 h-4 text-sky-400 hidden" />
                      </div>
                    )}

                    <div
                      className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                        isUser
                          ? 'bg-brand-blue text-white rounded-br-none'
                          : msg.isError
                          ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-none'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap select-text">{msg.content}</p>

                      <div className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                        <div className="flex items-center gap-2">
                          <span>{msg.timestamp}</span>
                          {msg.latencyMs && (
                            <span className="font-mono">⚡ {(msg.latencyMs / 1000).toFixed(2)}s</span>
                          )}
                        </div>

                        {!isUser && !msg.isError && (
                          <button
                            onClick={() => copyToClipboard(msg.content, idx)}
                            className="p-1 hover:text-slate-700 transition-colors rounded cursor-pointer"
                            title="Copy response"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {msg.isError && msg.failedPromptText && (
                        <div className="mt-2.5 pt-2 border-t border-rose-200/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-rose-700">Prompt preserved in memory</span>
                          <button
                            onClick={() => handleSendMessage(msg.failedPromptText)}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                            <span>Retry Prompt</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-blue flex items-center justify-center font-bold text-xs shrink-0 mb-1 shadow-sm border border-blue-200">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Dynamic WhatsApp Bouncing-Dots Typing Indicator */}
              {isSubmitting && (
                <div className="flex items-end gap-3 justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden shadow-sm shrink-0 mb-1 flex items-center justify-center">
                    <img
                      src={`/avatars/${level?.level_id || 1}.jpg`}
                      alt={level?.title || 'Sentinel'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Bot className="w-4 h-4 text-sky-400 hidden" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      {getThinkingText(level?.title)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar (ChatGPT-style auto-expanding prompt box, clean & minimal) */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
              {isViewingArchived ? (
                <div className="p-3 bg-slate-100 rounded-2xl text-center text-xs font-semibold text-slate-500">
                  Viewing archived level. Return to active battle to submit new prompts.
                </div>
              ) : (
                <div className="flex items-end gap-2.5 bg-slate-50 hover:bg-slate-50/80 focus-within:bg-white border-2 border-slate-300 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10 rounded-2xl p-2 pl-4 transition-all shadow-xs">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${level.title}...`}
                    disabled={isSubmitting}
                    rows={1}
                    className="flex-1 resize-none bg-transparent focus:outline-none text-sm text-slate-800 placeholder-slate-400 py-1 min-h-[44px] max-h-[180px] leading-relaxed overflow-y-auto"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isSubmitting || !inputText.trim()}
                    className="w-10 h-10 rounded-xl bg-brand-blue hover:bg-blue-700 text-white flex items-center justify-center shadow-sm hover:shadow transition-all transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer mb-0.5"
                    title="Send prompt"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: LEVEL OBJECTIVE & FLAG VERIFICATION (4 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 space-y-3.5 sm:space-y-4">
            
            {/* Objective Card */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                  Round {level.round_id}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{level.base_score} Points</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-900 shadow-sm shrink-0 bg-slate-900">
                  <img
                    src={`/avatars/${level?.level_id || 1}.jpg`}
                    alt={level?.title || 'Marvel Sentinel'}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">{level.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{level.description}</p>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-0.5">
                <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">Mission Target</span>
                <p className="text-xs font-semibold text-slate-800 leading-snug">{level.objective}</p>
              </div>

              {/* Attempt Limit Tracker */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Attempts Used:</span>
                <span className="font-mono">{attemptsUsed} / {level.attempt_limit}</span>
              </div>
            </div>

            {/* Flag / Password Verification Box */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Submit Extracted Flag</h4>
                  <p className="text-[10px] text-slate-500">Enter authorization password to unlock next level</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <input
                  type="text"
                  value={capturedPassword}
                  onChange={(e) => setCapturedPassword(e.target.value.toUpperCase())}
                  placeholder="e.g. CIPHER_TOKEN_XYZ"
                  disabled={isVerifying || isViewingArchived}
                  className={`w-full p-2.5 rounded-xl border-2 font-mono uppercase text-xs sm:text-sm font-bold placeholder-slate-300 focus:outline-none transition-all ${
                    shakeFlagInput
                      ? 'animate-shake border-rose-500 bg-rose-50'
                      : 'border-slate-300 focus:border-amber-500'
                  }`}
                />

                <button
                  onClick={handleVerifyPassword}
                  disabled={isVerifying || !capturedPassword.trim() || isViewingArchived}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {isVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify Flag & Unlock Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tactical Hints Drawer */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Tactical Intel</h4>
                    <p className="text-[10px] text-slate-500">Security bypass guidance</p>
                  </div>
                </div>

                {hintState.revealed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Revealed
                  </span>
                )}
              </div>

              {hintState.revealed ? (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 leading-relaxed">
                  {hintState.hint_text || level.hint_text}
                </div>
              ) : hintState.released ? (
                <div>
                  {showHintConfirm ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        Warning: Revealing this tactical hint incurs a severe <strong className="text-rose-600 font-bold">-{hintState.penalty || 25} points penalty</strong> from this level's score upon completion. Proceed?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRevealHint}
                          className="flex-1 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer"
                        >
                          Unlock Intel (-{hintState.penalty || 25} pts)
                        </button>
                        <button
                          onClick={() => setShowHintConfirm(false)}
                          className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHintConfirm(true)}
                      className="w-full py-2 px-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Unlock Classified Hint (-{hintState.penalty || 25} pts)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-100 text-slate-500 text-xs text-center font-medium">
                  Intel locked by competition organizers for this phase.
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

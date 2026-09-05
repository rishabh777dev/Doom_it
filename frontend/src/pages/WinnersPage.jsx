import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Medal, Crown, Sparkles, RefreshCw, Volume2, VolumeX, Shield, Award, ArrowLeft, Star, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { apiGetLeaderboard } from '../services/api';

// Web Audio API Fanfare Synthesizer (No external mp3 dependencies)
function playFanfareSound(stage) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (stage === 1) {
      // Bronze Reveal: Warm low-mid chime
      const notes = [261.63, 329.63, 392.0]; // C4, E4, G4
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.9);
      });
    } else if (stage === 2) {
      // Silver Reveal: Bright ascending fanfare
      const notes = [329.63, 392.0, 493.88, 587.33]; // E4, G4, B4, D5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 1.0);
      });
    } else if (stage === 3) {
      // Champion Gold Reveal: Grand Royal Fanfare Chords + Celebration
      const chords = [
        [261.63, 329.63, 392.0], // C major
        [329.63, 392.0, 523.25], // C/E
        [392.0, 493.88, 587.33], // G major
        [523.25, 659.25, 783.99, 1046.5], // Grand C6 crescendo!
      ];
      chords.forEach((chord, step) => {
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = step === 3 ? 'triangle' : 'sine';
          const startTime = ctx.currentTime + step * 0.22;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(step === 3 ? 0.28 : 0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 1.5);
        });
      });
    }
  } catch (err) {
    // AudioContext blocked by browser policy
  }
}

function launchConfettiCelebration() {
  // Left cannon
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 55,
    origin: { x: 0.1, y: 0.65 },
    colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'],
  });
  // Right cannon
  confetti({
    particleCount: 80,
    angle: 120,
    spread: 55,
    origin: { x: 0.9, y: 0.65 },
    colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'],
  });
  // Center star burst
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#FFD700', '#FFA500', '#FFFFFF', '#60A5FA'],
    });
  }, 350);
}

export default function WinnersPage({ timerState, user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Reveal steps: 0 = Pre-reveal, 1 = Reveal 3rd, 2 = Reveal 2nd, 3 = Reveal Champion 1st
  const [revealStep, setRevealStep] = useState(3); // default full reveal, can be replayed
  const [isRevealing, setIsRevealing] = useState(false);

  const isCeremonyActive = Boolean(timerState?.ceremony_active || user?.role === 'ADMIN');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiGetLeaderboard();
      setEntries(res.entries || []);
    } catch (err) {
      console.error('Failed to load standings for ceremony:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartReveal = () => {
    setIsRevealing(true);
    setRevealStep(0);

    // Sequence: 3rd -> 2nd -> 1st Champion
    setTimeout(() => {
      setRevealStep(1);
      if (soundEnabled) playFanfareSound(1);
      confetti({ particleCount: 35, spread: 45, origin: { x: 0.8, y: 0.7 }, colors: ['#CD7F32', '#B87333'] });
    }, 1200);

    setTimeout(() => {
      setRevealStep(2);
      if (soundEnabled) playFanfareSound(2);
      confetti({ particleCount: 45, spread: 50, origin: { x: 0.2, y: 0.65 }, colors: ['#C0C0C0', '#E5E7EB'] });
    }, 3200);

    setTimeout(() => {
      setRevealStep(3);
      if (soundEnabled) playFanfareSound(3);
      launchConfettiCelebration();
      setIsRevealing(false);
    }, 5500);
  };

  const top1 = entries[0] || null;
  const top2 = entries[1] || null;
  const top3 = entries[2] || null;

  // If ceremony not active and not admin, show locked waiting room
  if (!isCeremonyActive) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border-2 border-slate-200 shadow-xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-500 flex items-center justify-center mx-auto shadow-sm animate-pulse">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-100/70 border border-amber-300 px-3.5 py-1 rounded-full">
              Tournament Finale Awaiting
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
              Grand Winner Ceremony
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
              Competition arbiters are verifying final prompt logs, deduplicating submissions, and tallying official scores.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
            Status: <span className="font-bold text-amber-600">Verification in Progress</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/leaderboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Scoreboard</span>
            </Link>
            <button
              onClick={loadData}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Check for Ceremony</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Official Tournament Finale
            </span>
            {user?.role === 'ADMIN' && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300 px-2 py-0.5 rounded-md">
                Admin Preview Mode
              </span>
            )}
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl text-slate-900 tracking-tight mt-2">
            Hall of Champions 🏆
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
            Celebrating the top AI Safety & Jailbreak engineers of VakyaBhed 2026.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title={soundEnabled ? "Audio Fanfare Active" : "Audio Fanfare Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={handleStartReveal}
            disabled={isRevealing}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>{revealStep === 3 && !isRevealing ? 'Replay Reveal' : 'Revealing Winners...'}</span>
          </button>
        </div>
      </div>

      {/* Stepped Olympic Podium Stage */}
      <div className="pt-8 sm:pt-14 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-end max-w-4xl mx-auto">
          
          {/* ========================================================= */}
          {/* 2nd Place - SILVER (Left on Desktop)                      */}
          {/* ========================================================= */}
          <div className="order-2 sm:order-1 flex flex-col justify-end transition-all duration-700">
            {revealStep >= 2 && top2 ? (
              <div className="animate-fadeIn space-y-2">
                <div className="relative p-5 sm:p-6 rounded-3xl border-2 border-slate-300 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white shadow-card flex flex-col justify-between space-y-3.5 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                        <Medal className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-slate-400 leading-none">
                          Runner-Up
                        </span>
                        <span className="text-xs font-bold text-slate-600">2nd Place</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-black text-sm shadow-sm">
                      2
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-slate-900 truncate">
                      {top2.team_name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <span className="font-semibold">Solved {top2.levels_solved}/12</span>
                      <span>•</span>
                      <span className="font-bold text-brand-blue">Round {top2.current_round}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-baseline justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
                    <span className="font-mono font-black text-2xl text-slate-700">
                      {top2.total_score} <span className="text-xs text-slate-400 font-normal">pts</span>
                    </span>
                  </div>
                </div>

                {/* Silver Stepped Base */}
                <div className="w-full h-20 sm:h-28 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-t-3xl border-t-2 border-x-2 border-slate-300 flex flex-col items-center justify-center shadow-lg">
                  <span className="font-display font-black text-4xl text-slate-800 opacity-90">2</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 -mt-1">Silver</span>
                </div>
              </div>
            ) : (
              <div className="h-48 sm:h-64 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Medal className="w-8 h-8 opacity-40 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Awaiting 2nd Place</span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 1st Place - GOLD GRAND CHAMPION (Center, Elevated Tallest) */}
          {/* ========================================================= */}
          <div className="order-1 sm:order-2 flex flex-col justify-end transition-all duration-700 sm:-translate-y-4">
            {revealStep >= 3 && top1 ? (
              <div className="animate-fadeIn space-y-2 relative">
                {/* Grand Champion Glowing Aura */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative p-6 sm:p-7 rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/20 via-amber-100/40 to-white shadow-2xl ring-4 ring-amber-300/60 flex flex-col justify-between space-y-4 hover:shadow-amber-500/25 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-amber-950 shadow-md shadow-amber-400/50 flex items-center justify-center shrink-0 animate-bounce">
                        <Crown className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block text-amber-700 leading-none">
                          Grand Champion 👑
                        </span>
                        <span className="text-sm font-black text-amber-700">1st Place</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center font-black text-base shadow-md shadow-amber-400/40">
                      1
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900 truncate">
                      {top1.team_name}
                    </h3>
                    <div className="text-xs text-amber-900/80 font-bold mt-1 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>Solved {top1.levels_solved}/12 Levels</span>
                      <span>•</span>
                      <span>Round {top1.current_round}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-amber-300/70 flex items-baseline justify-between">
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Final Score</span>
                    <span className="font-mono font-black text-3xl text-emerald-600">
                      {top1.total_score} <span className="text-xs text-slate-400 font-normal">pts</span>
                    </span>
                  </div>
                </div>

                {/* Gold Stepped Base */}
                <div className="w-full h-28 sm:h-36 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-t-3xl border-t-2 border-x-2 border-amber-400 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                  <span className="font-display font-black text-5xl text-amber-950 opacity-90 drop-shadow">1</span>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-950 -mt-1">Champion</span>
                </div>
              </div>
            ) : (
              <div className="h-56 sm:h-72 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center text-amber-600 space-y-2">
                <Crown className="w-10 h-10 opacity-40 animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wider">Awaiting Champion Reveal</span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 3rd Place - BRONZE (Right on Desktop)                     */}
          {/* ========================================================= */}
          <div className="order-3 sm:order-3 flex flex-col justify-end transition-all duration-700">
            {revealStep >= 1 && top3 ? (
              <div className="animate-fadeIn space-y-2">
                <div className="relative p-5 sm:p-6 rounded-3xl border-2 border-amber-700/30 bg-gradient-to-b from-amber-900/10 via-amber-800/5 to-white shadow-card flex flex-col justify-between space-y-3.5 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                        <Medal className="w-6 h-6 text-amber-700" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-amber-700/70 leading-none">
                          2nd Runner-Up
                        </span>
                        <span className="text-xs font-bold text-amber-800">3rd Place</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-black text-sm shadow-sm">
                      3
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-slate-900 truncate">
                      {top3.team_name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <span className="font-semibold">Solved {top3.levels_solved}/12</span>
                      <span>•</span>
                      <span className="font-bold text-brand-blue">Round {top3.current_round}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-baseline justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
                    <span className="font-mono font-black text-2xl text-amber-900">
                      {top3.total_score} <span className="text-xs text-slate-400 font-normal">pts</span>
                    </span>
                  </div>
                </div>

                {/* Bronze Stepped Base */}
                <div className="w-full h-16 sm:h-20 bg-gradient-to-b from-amber-600/80 via-amber-700 to-amber-800 rounded-t-3xl border-t-2 border-x-2 border-amber-700 flex flex-col items-center justify-center shadow-lg">
                  <span className="font-display font-black text-3xl text-amber-100 opacity-90">3</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 -mt-1">Bronze</span>
                </div>
              </div>
            ) : (
              <div className="h-44 sm:h-56 rounded-3xl border-2 border-dashed border-amber-700/30 bg-amber-900/5 flex flex-col items-center justify-center text-amber-700 space-y-2">
                <Medal className="w-7 h-7 opacity-40 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Awaiting 3rd Place</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Full Top 10 Tournament Standings Table */}
      {entries.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-brand-blue" />
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-slate-900">
                Official Final Standings
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Verified by Arbiters
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Round Reached</th>
                  <th className="py-3 px-4 text-center">Levels Solved</th>
                  <th className="py-3 px-4 text-right">Final Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {entries.map((entry, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <tr
                      key={entry.team_name}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        rank === 1
                          ? 'bg-amber-50/40 font-bold'
                          : rank === 2
                          ? 'bg-slate-50/50'
                          : rank === 3
                          ? 'bg-amber-900/5'
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            rank === 1
                              ? 'bg-amber-400 text-amber-950 shadow-sm'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : rank === 3
                              ? 'bg-amber-700 text-amber-100'
                              : 'text-slate-500'
                          }`}
                        >
                          {rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span>{entry.team_name}</span>
                        {rank === 1 && <Crown className="w-4 h-4 text-amber-500 inline" />}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs">
                          Round {entry.current_round}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        {entry.levels_solved} / 12
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 text-base">
                        {entry.total_score} <span className="text-xs text-slate-400 font-normal">pts</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

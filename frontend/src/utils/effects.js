import confetti from 'canvas-confetti';

// ==========================================
// 1. CELEBRATION EFFECTS (Confetti & Streamers)
// ==========================================
export const triggerVictoryConfetti = () => {
  // Cannon from Left
  confetti({
    particleCount: 75,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.7 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
  });

  // Cannon from Right
  confetti({
    particleCount: 75,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.7 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
  });

  // Center Golden Shower
  setTimeout(() => {
    confetti({
      particleCount: 110,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffffff'],
      shapes: ['star', 'circle'],
    });
  }, 250);
};

// ==========================================
// 2. ZERO-LATENCY BROWSER AUDIO SYNTHESIZER
// ==========================================
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const isSoundMuted = () => {
  return localStorage.getItem('sfx_muted') === 'true';
};

export const toggleSoundMuted = () => {
  const current = isSoundMuted();
  localStorage.setItem('sfx_muted', String(!current));
  window.dispatchEvent(new Event('sound_toggle'));
  return !current;
};

export const playSound = (type = 'receive') => {
  if (isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'send') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'receive') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      osc2.frequency.setValueAtTime(880.00, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } else if (type === 'victory') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.09;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.15, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    // AudioContext autoplay restrictions
  }
};

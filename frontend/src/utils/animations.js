import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { playSound } from './effects';

/**
 * Centralized Animation Constants & Easing Curves
 */
export const EASING = {
  superSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Elastic overshoot for victories & rank surges
  smoothDecel: 'cubic-bezier(0.16, 1, 0.3, 1)',      // Silky smooth exponential deceleration
  snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',            // Quick responsive micro-interaction
  tactilePress: 'cubic-bezier(0.2, 0.8, 0.4, 1)',    // Neo-brutalist tactile button press
};

export const DURATION = {
  instant: 120,
  fast: 220,
  normal: 380,
  super: 750,
  celebration: 1200,
};

/**
 * Hook to detect if the user has enabled reduced motion preferences in their OS/browser
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const onChange = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to smoothly count up a numerical value with exponential deceleration
 */
export function useCountUp(targetValue, duration = 800, startImmediately = true, startFrom = null) {
  const prefersReduced = useReducedMotion();
  const initial = startFrom !== null ? startFrom : targetValue;
  const [displayValue, setDisplayValue] = useState(initial);
  const prevValueRef = useRef(initial);

  useEffect(() => {
    if (prefersReduced || !startImmediately) {
      setDisplayValue(targetValue);
      prevValueRef.current = targetValue;
      return;
    }

    const startValue = prevValueRef.current;
    const diff = targetValue - startValue;
    if (diff === 0 && displayValue === targetValue) return;

    let startTime = null;
    let animFrameId = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Exponential ease-out
      const ease = 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startValue + diff * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
        prevValueRef.current = targetValue;
      }
    };

    animFrameId = requestAnimationFrame(step);
    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [targetValue, duration, prefersReduced, startImmediately]);

  return displayValue;
}

/**
 * FLIP (First, Last, Invert, Play) Rank Animation Engine for the Scoreboard
 * 
 * Tracks team positions and detects when a team scores or moves up in rank.
 * When an entry ascends:
 * 1. Computes the exact vertical distance (deltaY) between old position and new position
 * 2. Inverts position instantly via GPU-accelerated transform: translate3d(0, deltaY, 0)
 * 3. Plays a high-impact spring transition upward to 0 with radiant neon aura
 * 4. Displays promotion delta pill (e.g. ? +2) and sound cue
 */
export function useScoreboardRankAnimation(entries, user) {
  const prefersReduced = useReducedMotion();
  const rowRefs = useRef({});
  const prevPositionsRef = useRef({});
  const prevDataRef = useRef({});
  const [animationStates, setAnimationStates] = useState({});

  // 1. Snapshot previous bounding rects before DOM re-renders
  useLayoutEffect(() => {
    if (prefersReduced) return;

    const currentPositions = {};
    Object.keys(rowRefs.current).forEach((key) => {
      const el = rowRefs.current[key];
      if (el) {
        currentPositions[key] = el.getBoundingClientRect().top;
      }
    });

    const newAnimationStates = {};
    let shouldPlayVictorySound = false;

    entries.forEach((entry) => {
      const key = entry.team_name;
      const prevTop = prevPositionsRef.current[key];
      const currentTop = currentPositions[key];
      const prevData = prevDataRef.current[key];

      if (prevTop !== undefined && currentTop !== undefined) {
        const deltaY = prevTop - currentTop;
        const rankDelta = prevData ? prevData.rank - entry.rank : 0;
        const scoreDelta = prevData ? entry.total_score - prevData.total_score : 0;

        // Team climbed in rank or scored points!
        if (deltaY > 2 || rankDelta > 0 || scoreDelta > 0) {
          newAnimationStates[key] = {
            deltaY: deltaY,
            rankDelta: rankDelta,
            scoreDelta: scoreDelta,
            isClimbing: deltaY > 2 || rankDelta > 0,
            hasScored: scoreDelta > 0,
            timestamp: Date.now(),
          };

          const isUserTeam = user?.username && entry.team_name.toLowerCase() === user.username.toLowerCase();
          if (isUserTeam || entry.rank === 1) {
            shouldPlayVictorySound = true;
          }
        }
      }
    });

    // 2. Invert and Play FLIP animations on climbing rows
    Object.keys(newAnimationStates).forEach((key) => {
      const state = newAnimationStates[key];
      const el = rowRefs.current[key];

      if (el && state.deltaY !== 0) {
        // First & Invert: Set initial position back to where it was
        el.style.transform = `translate3d(0, ${state.deltaY}px, 0)`;
        el.style.transition = 'none';

        // Force reflow
        void el.offsetHeight;

        // Play: Smooth spring release upward to its new home
        el.style.transition = `transform ${DURATION.super}ms ${EASING.superSpring}`;
        el.style.transform = 'translate3d(0, 0, 0)';
      }
    });

    if (Object.keys(newAnimationStates).length > 0) {
      setAnimationStates(newAnimationStates);
      if (shouldPlayVictorySound) {
        playSound('victory');
      }

      // Automatically reset highlight badges after celebration duration
      const timer = setTimeout(() => {
        setAnimationStates({});
      }, DURATION.celebration + 800);

      return () => clearTimeout(timer);
    }

    // Update snapshots for the next cycle
    prevPositionsRef.current = currentPositions;
    const currentDataMap = {};
    entries.forEach((e) => {
      currentDataMap[e.team_name] = { rank: e.rank, total_score: e.total_score };
    });
    prevDataRef.current = currentDataMap;
  }, [entries, prefersReduced, user]);

  return {
    rowRefs,
    animationStates,
    prefersReduced,
  };
}

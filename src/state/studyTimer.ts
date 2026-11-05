/**
 * Browser study timer. Screens declare what the learner is doing with `useStudyContext`; the
 * timer credits active time every few seconds using the pure rules in engine/studyTime.ts.
 * One tab at a time holds a lock in localStorage, so two open tabs never double-count.
 */
import { useEffect } from 'react';
import { Brand } from '@/config/brand';
import type { StudyContext } from '@/engine/events';
import { uid } from '@/engine/random';
import { canHoldLock, creditableMs, TICK_MS, type Lock } from '@/engine/studyTime';
import { useProgress } from './progress';

const LOCK_KEY = `${Brand.storageKey}:timer-lock`;
/** Stable across reloads of the same tab (sessionStorage), distinct between tabs. */
const tabId = (() => {
  try {
    const k = `${Brand.storageKey}:tab-id`;
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const id = uid();
    sessionStorage.setItem(k, id);
    return id;
  } catch {
    return uid();
  }
})();

function releaseLock() {
  try {
    if (readLock()?.tabId === tabId) localStorage.removeItem(LOCK_KEY);
  } catch {
    /* storage unavailable */
  }
}

let context: StudyContext | null = null;
let lastTick: number | null = null;
let lastInteraction = Date.now();
let started = false;
let paused = false;

function readLock(): Lock | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? (JSON.parse(raw) as Lock) : null;
  } catch {
    return null;
  }
}

function takeLock(now: number): boolean {
  try {
    if (!canHoldLock(readLock(), tabId, now)) return false;
    localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId, at: now }));
    return true;
  } catch {
    return true; // storage blocked: single-tab behaviour
  }
}

function tick() {
  const now = Date.now();
  const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
  const holdsLock = visible && takeLock(now);
  const ms = creditableMs({ now, lastTick, lastInteraction, visible: visible && !paused, hasContext: !!context, holdsLock });
  if (ms > 0 && context) useProgress.getState().creditStudy(ms, context);
  // Reset the tick baseline whenever we can't count, so time hidden or idle is never credited later.
  lastTick = visible && !paused && context ? now : null;
}

function flush() {
  tick();
  releaseLock();
}

export function startStudyTimer() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const touch = () => {
    lastInteraction = Date.now();
    if (lastTick === null && context && !paused) lastTick = Date.now();
  };
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel']) window.addEventListener(ev, touch, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else touch();
  });
  window.addEventListener('pagehide', flush);
  window.setInterval(tick, TICK_MS);
}

export function setStudyContext(ctx: StudyContext | null) {
  if (context) tick(); // close out time for the previous context first
  context = ctx;
  lastInteraction = Date.now();
  lastTick = ctx ? Date.now() : null;
}

/** Pause/resume (e.g. a game's pause button). */
export function setStudyPaused(p: boolean) {
  if (p) tick();
  paused = p;
  lastTick = p ? null : Date.now();
}

/** Declare the current study context for the lifetime of a screen. */
export function useStudyContext(ctx: StudyContext | null) {
  const key = ctx ? `${ctx.activity}|${ctx.gameId ?? ''}|${(ctx.conceptIds ?? []).join(',')}` : '';
  useEffect(() => {
    setStudyContext(ctx);
    return () => setStudyContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialised context
  }, [key]);
}

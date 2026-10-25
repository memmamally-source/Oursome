import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { useSettings } from '@/features/settings/store';

/**
 * Oursome's motion rules (durations and easing live in tokens.motion):
 * - Productivity screens move quickly and briefly; journal moments may be slower.
 * - Every animation has a purpose and never blocks input.
 * - When the device asks for reduced motion, or the user turns it off in
 *   Settings, things appear in place instead of moving.
 */

/** The native driver keeps animation off the JS thread; react-native-web has none. */
export const nativeDriver = Platform.OS !== 'web';

function systemReduced(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

/** True when animations should be skipped or replaced by a simple fade. */
export function useReducedMotion(): boolean {
  const pref = useSettings((s) => s.motion);
  const [system, setSystem] = useState(systemReduced);
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const on = () => setSystem(mq.matches);
      mq.addEventListener?.('change', on);
      return () => mq.removeEventListener?.('change', on);
    }
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setSystem(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return pref === 'reduced' || system;
}

/** Non-hook check for event handlers. */
export function reducedMotionNow(): boolean {
  return useSettings.getState().motion === 'reduced' || systemReduced();
}

import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, View } from 'react-native';

import { Button } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { motion, space, useTheme } from '@/theme';
import { nativeDriver, useReducedMotion } from '@/theme/motion';

type Props = {
  count: number;
  /** Index of the first visible page (a multiple of 2 in a spread). */
  index: number;
  onIndexChange: (index: number) => void;
  renderPage: (i: number) => ReactNode;
  /** Two pages side by side, turning on a central spine. */
  spread: boolean;
  pageWidth: number;
  pageHeight: number;
};

type Turn = { dir: 1 | -1; t: Animated.Value };

/** The page under the finger, between gesture events (never read while rendering). */
class DragHold {
  private turn: Turn | null = null;
  hold(t: Turn) {
    this.turn = t;
    return t;
  }
  peek() {
    return this.turn;
  }
  release() {
    const t = this.turn;
    this.turn = null;
    return t;
  }
}

/** Pages a turn moves by, and whether a turn that way is possible. */
export function canTurn(index: number, count: number, dir: 1 | -1, spread: boolean): boolean {
  const step = spread ? 2 : 1;
  return dir === 1 ? index + step < count : index - step >= 0;
}

/**
 * A book whose pages turn on their spine. Pages lift with a moving shadow;
 * drag a page edge to turn it by hand, or use the arrow keys. With reduced
 * motion the next page simply fades in.
 */
export function PageTurn({ count, index, onIndexChange, renderPage, spread, pageWidth, pageHeight }: Props) {
  const { palette } = useTheme();
  const reduced = useReducedMotion();
  const [turn, setTurn] = useState<Turn | null>(null);
  const [fade] = useState(() => new Animated.Value(1));
  const step = spread ? 2 : 1;

  const finish = (dir: 1 | -1, t: Animated.Value, complete: boolean) => {
    Animated.timing(t, {
      toValue: complete ? 1 : 0,
      duration: complete ? motion.duration.page : motion.duration.base,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start(() => {
      if (complete) onIndexChange(index + dir * step);
      setTurn(null);
    });
  };

  const go = (dir: 1 | -1) => {
    if (turn || !canTurn(index, count, dir, spread)) return;
    if (reduced) {
      fade.setValue(0);
      onIndexChange(index + dir * step);
      Animated.timing(fade, { toValue: 1, duration: motion.duration.base, useNativeDriver: nativeDriver }).start();
      return;
    }
    const t = new Animated.Value(0);
    setTurn({ dir, t });
    finish(dir, t, true);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && /input|textarea/i.test(target.tagName)) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Dragging: a page follows the finger and completes the turn past a third.
  const width = pageWidth;
  const [drag] = useState(() => new DragHold());
  const responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => !turn && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    // Once a page is in hand, the page's scroller doesn't get to take it.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (_, g) => {
      const dir = g.dx < 0 ? 1 : -1;
      if (reduced || !canTurn(index, count, dir, spread)) return;
      setTurn(drag.hold({ dir, t: new Animated.Value(0) }));
    },
    onPanResponderMove: (_, g) => {
      const current = drag.peek();
      if (!current) return;
      const p = (current.dir === 1 ? -g.dx : g.dx) / width;
      current.t.setValue(Math.max(0, Math.min(1, p)));
    },
    onPanResponderRelease: (_, g) => {
      const current = drag.release();
      if (!current) {
        const dir = g.dx < 0 ? 1 : -1;
        if (reduced && Math.abs(g.dx) > 40) go(dir);
        return;
      }
      const p = (current.dir === 1 ? -g.dx : g.dx) / width;
      const v = current.dir === 1 ? -g.vx : g.vx;
      finish(current.dir, current.t, p > 0.33 || v > 0.5);
    },
    onPanResponderTerminate: () => {
      const current = drag.release();
      if (current) finish(current.dir, current.t, false);
    },
  });

  const page = (i: number) => (i >= 0 && i < count ? renderPage(i) : <View style={{ flex: 1, backgroundColor: palette.surface }} />);
  const leafStyle = { position: 'absolute' as const, top: 0, width: pageWidth, height: pageHeight, backfaceVisibility: 'hidden' as const };
  const shade = (t: Animated.Value, range: number[], out: number[]) => (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#2A1E17',
        opacity: t.interpolate({ inputRange: range, outputRange: out, extrapolate: 'clamp' }),
      }}
    />
  );
  const rotate = (t: Animated.Value, range: number[], deg: number[], origin: 'left' | 'right') => ({
    transformOrigin: origin,
    transform: [
      { perspective: 1600 },
      { rotateY: t.interpolate({ inputRange: range, outputRange: deg.map((d) => `${d}deg`), extrapolate: 'clamp' }) },
    ],
  });

  const bookWidth = spread ? pageWidth * 2 : pageWidth;
  let layers: ReactNode;

  if (!spread) {
    if (!turn) layers = <View style={leafStyle}>{page(index)}</View>;
    else if (turn.dir === 1) {
      // The current page lifts off its left edge, uncovering the next.
      layers = (
        <>
          <View style={leafStyle}>
            {page(index + 1)}
            {shade(turn.t, [0, 1], [0.18, 0])}
          </View>
          <Animated.View style={[leafStyle, rotate(turn.t, [0, 1], [0, -92], 'left')]}>
            {page(index)}
            {shade(turn.t, [0, 1], [0, 0.35])}
          </Animated.View>
        </>
      );
    } else {
      layers = (
        <>
          <View style={leafStyle}>
            {page(index)}
            {shade(turn.t, [0, 1], [0, 0.18])}
          </View>
          <Animated.View style={[leafStyle, rotate(turn.t, [0, 1], [-92, 0], 'left')]}>
            {page(index - 1)}
            {shade(turn.t, [0, 1], [0.35, 0])}
          </Animated.View>
        </>
      );
    }
  } else {
    const left = { ...leafStyle, left: 0 };
    const right = { ...leafStyle, left: pageWidth };
    if (!turn) {
      layers = (
        <>
          <View style={left}>{page(index)}</View>
          <View style={right}>{page(index + 1)}</View>
        </>
      );
    } else if (turn.dir === 1) {
      // The right page swings over the spine; its back lands on the left.
      layers = (
        <>
          <View style={left}>{page(index)}</View>
          <View style={right}>
            {page(index + 3)}
            {shade(turn.t, [0, 1], [0.2, 0])}
          </View>
          <Animated.View
            style={[
              right,
              rotate(turn.t, [0, 0.5, 1], [0, -90, -90], 'left'),
              { opacity: turn.t.interpolate({ inputRange: [0, 0.499, 0.5], outputRange: [1, 1, 0] }) },
            ]}>
            {page(index + 1)}
            {shade(turn.t, [0, 0.5], [0, 0.4])}
          </Animated.View>
          <Animated.View
            style={[
              left,
              rotate(turn.t, [0, 0.5, 1], [90, 90, 0], 'right'),
              { opacity: turn.t.interpolate({ inputRange: [0, 0.5, 0.501], outputRange: [0, 0, 1] }) },
            ]}>
            {page(index + 2)}
            {shade(turn.t, [0.5, 1], [0.4, 0])}
          </Animated.View>
        </>
      );
    } else {
      layers = (
        <>
          <View style={left}>
            {page(index - 2)}
            {shade(turn.t, [0, 1], [0.2, 0])}
          </View>
          <View style={right}>{page(index + 1)}</View>
          <Animated.View
            style={[
              left,
              rotate(turn.t, [0, 0.5, 1], [0, 90, 90], 'right'),
              { opacity: turn.t.interpolate({ inputRange: [0, 0.499, 0.5], outputRange: [1, 1, 0] }) },
            ]}>
            {page(index)}
            {shade(turn.t, [0, 0.5], [0, 0.4])}
          </Animated.View>
          <Animated.View
            style={[
              right,
              rotate(turn.t, [0, 0.5, 1], [-90, -90, 0], 'left'),
              { opacity: turn.t.interpolate({ inputRange: [0, 0.5, 0.501], outputRange: [0, 0, 1] }) },
            ]}>
            {page(index - 1)}
            {shade(turn.t, [0.5, 1], [0.4, 0])}
          </Animated.View>
        </>
      );
    }
  }

  const shown = spread ? `Pages ${index + 1}–${Math.min(index + 2, count)} of ${count}` : `Page ${index + 1} of ${count}`;

  return (
    <View style={{ gap: space.lg, alignItems: 'center' }}>
      <View {...responder.panHandlers} style={{ width: bookWidth, height: pageHeight }}>
        <Animated.View
          style={{
            width: bookWidth,
            height: pageHeight,
            opacity: fade,
            borderRadius: 6,
            shadowColor: '#2A1E17',
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}>
          {layers}
          {spread ? (
            // The spine's soft crease.
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: pageWidth - 10,
                width: 20,
                backgroundColor: '#2A1E17',
                opacity: 0.06,
              }}
            />
          ) : null}
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Button
          label="Previous"
          icon="chevron-back"
          variant="secondary"
          size="sm"
          onPress={() => go(-1)}
          disabled={!canTurn(index, count, -1, spread)}
        />
        <Text variant="caption" tone="secondary" aria-live="polite" style={{ minWidth: 96, textAlign: 'center' }}>
          {shown}
        </Text>
        <Button
          label="Next"
          icon="chevron-forward"
          variant="secondary"
          size="sm"
          onPress={() => go(1)}
          disabled={!canTurn(index, count, 1, spread)}
        />
      </View>
    </View>
  );
}

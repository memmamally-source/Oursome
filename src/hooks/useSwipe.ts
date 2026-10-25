import { useMemo } from 'react';
import { PanResponder } from 'react-native';

/**
 * Horizontal swipe on a view (left = next, right = previous) that leaves
 * vertical scrolling inside it alone. Spread `handlers` onto the view.
 */
export function useSwipe(onNext: () => void, onPrevious: () => void) {
  return useMemo(() => {
    const horizontal = (dx: number, dy: number) => Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.6;
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => horizontal(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -50 || g.vx < -0.5) onNext();
        else if (g.dx >= 50 || g.vx > 0.5) onPrevious();
      },
    }).panHandlers;
  }, [onNext, onPrevious]);
}

import { useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { motion } from '@/theme';
import { useReducedMotion } from '@/theme/motion';

/**
 * A row that folds away (slides a little, fades and collapses) before an
 * action moves it elsewhere, such as completing a task or buying an item.
 * With reduced motion the action happens at once.
 */
export function useFoldAway() {
  const reduced = useReducedMotion();
  const [fold] = useState(() => new Animated.Value(1));
  const [height, setHeight] = useState<number | null>(null);
  const [folding, setFolding] = useState(false);

  const onLayout = (e: LayoutChangeEvent) => {
    if (!folding) setHeight(e.nativeEvent.layout.height);
  };

  const run = (action: () => void) => {
    const done = () => {
      action();
      fold.setValue(1);
      setFolding(false);
    };
    if (reduced || height === null) return done();
    setFolding(true);
    // Height can't use the native driver; rows are small, so this stays smooth.
    Animated.timing(fold, { toValue: 0, duration: motion.duration.base, delay: 140, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(done);
  };

  const style =
    folding && height !== null
      ? {
          height: fold.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
          opacity: fold,
          transform: [{ translateX: fold.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          overflow: 'hidden' as ViewStyle['overflow'],
        }
      : undefined;

  return { style, onLayout, run, folding };
}

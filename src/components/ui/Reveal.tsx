import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { motion } from '@/theme';
import { nativeDriver, useReducedMotion } from '@/theme/motion';

/**
 * Content that gently rises into place once, when first shown. Web uses a
 * CSS animation (cheap, cancelled by the reduced-motion rule); native uses
 * the native driver. Use small staggered delays for groups of cards.
 */
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  if (Platform.OS === 'web') {
    const anim = reduced
      ? null
      : ({
          animationKeyframes: [{ from: { opacity: 0, transform: [{ translateY: 10 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } }],
          animationDuration: `${motion.duration.slow}ms`,
          animationDelay: `${delay}ms`,
          animationTimingFunction: motion.css.out,
          animationFillMode: 'both',
        } as unknown as ViewStyle);
    return <View style={[style, anim]}>{children}</View>;
  }
  return <NativeReveal delay={delay} style={style} reduced={reduced}>{children}</NativeReveal>;
}

function NativeReveal({ children, delay, style, reduced }: { children: ReactNode; delay: number; style?: StyleProp<ViewStyle>; reduced: boolean }) {
  const [t] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (reduced) return;
    Animated.timing(t, { toValue: 1, duration: motion.duration.slow, delay, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [t, delay, reduced]);
  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

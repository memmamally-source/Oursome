import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useTheme, accentKeys } from '@/theme';

const PIECES = 16;

/** Small deterministic PRNG so each burst varies without impure renders. */
function seeded(seed: number) {
  let x = seed % 2147483647 || 1;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

/**
 * A short burst of brand-coloured confetti, driven by one animated value.
 * Render it with a new `burstKey` to replay.
 */
export function Celebration({ burstKey }: { burstKey: number }) {
  const { palette } = useTheme();
  const [t] = useState(() => new Animated.Value(0));

  const pieces = useMemo(() => {
    const rand = seeded(burstKey);
    return Array.from({ length: PIECES }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PIECES + (rand() - 0.5) * 0.4;
      const distance = 60 + rand() * 70;
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        color: palette.accents[accentKeys[i % accentKeys.length]].base,
        size: 7 + rand() * 5,
        round: i % 3 === 0,
      };
    });
  }, [burstKey, palette]);

  useEffect(() => {
    if (!burstKey) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [burstKey, t]);

  if (!burstKey) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {pieces.map((p, i) => (
        <Animated.View
          key={`${burstKey}-${i}`}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy + 40] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '240deg'] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

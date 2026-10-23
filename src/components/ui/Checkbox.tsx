import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme, type AccentKey } from '@/theme';

/** Round check that fills with mint and gives a small, satisfying pop. */
export function Checkbox({
  checked,
  onToggle,
  accent = 'mint',
  size = 26,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  accent?: AccentKey;
  size?: number;
  label: string;
}) {
  const { palette } = useTheme();
  const tone = palette.accents[accent];
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.set(withTiming(checked ? 1 : 0, { duration: 180 }));
  }, [checked, progress]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', tone.base]),
    borderColor: interpolateColor(progress.value, [0, 1], [palette.textTertiary, tone.base]),
    transform: [{ scale: scale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.5 + progress.value * 0.5 }] }));

  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => {
        if (!checked) {
          haptic.success();
          scale.set(withSequence(withSpring(1.25, { damping: 6, stiffness: 400 }), withSpring(1)));
        } else {
          haptic.tap();
        }
        onToggle();
      }}>
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: size / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
          boxStyle,
        ]}>
        <Animated.View style={checkStyle}>
          <Ionicons name="checkmark" size={size * 0.68} color={palette.onAccent} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

import { useState } from 'react';
import { Animated, Platform, Pressable } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useTheme, type AccentKey } from '@/theme';

import { Icon } from './Icon';

const native = Platform.OS !== 'web';

/** Round check that fills instantly and gives a small, satisfying pop. */
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
  const [scale] = useState(() => new Animated.Value(1));

  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={label}
      onPress={() => {
        // Update state first so the tick appears immediately; the pop is decoration.
        onToggle();
        if (!checked) {
          haptic.success();
          scale.setValue(0.8);
          Animated.spring(scale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: native }).start();
        } else {
          haptic.tap();
        }
      }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? tone.base : 'transparent',
          borderColor: checked ? tone.base : palette.textTertiary,
          transform: [{ scale }],
        }}>
        {checked ? <Icon name="checkmark" size={size * 0.68} color={palette.onAccent} /> : null}
      </Animated.View>
    </Pressable>
  );
}

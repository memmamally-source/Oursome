import type { ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
};

// On web a CSS transition keeps the press feedback off the JS thread.
const webTransition = Platform.OS === 'web' ? ({ transitionProperty: 'transform', transitionDuration: '140ms' } as ViewStyle) : null;

/** Pressable with a subtle press-in scale — the base micro-interaction. */
export function PressableScale({ style, children, scaleTo = 0.97, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [style, webTransition, { transform: [{ scale: pressed ? scaleTo : 1 }] }]}>
      {children}
    </Pressable>
  );
}

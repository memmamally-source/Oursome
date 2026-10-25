import type { ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
};

// On web a CSS transition keeps the feedback off the JS thread; a springy curve feels tactile.
const webTransition =
  Platform.OS === 'web'
    ? ({ transitionProperty: 'transform, box-shadow', transitionDuration: '180ms', transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' } as ViewStyle)
    : null;

/** Pressable with a subtle press-in scale and (on web) a gentle lift on hover. */
export function PressableScale({ style, children, scaleTo = 0.97, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={(state) => {
        const { pressed } = state;
        const hovered = (state as { hovered?: boolean }).hovered;
        return [style, webTransition, { transform: [{ scale: pressed ? scaleTo : 1 }, { translateY: hovered && !pressed ? -2 : 0 }] }];
      }}>
      {children}
    </Pressable>
  );
}

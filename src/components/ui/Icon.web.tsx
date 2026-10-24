import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { ICONS } from './icons.generated';
import type { IconProps } from './Icon';

/** Web: a plain inline <svg> — no icon font, no SVG runtime. */
export function Icon({ name, size = 20, color, style, accessibilityLabel }: IconProps) {
  const { palette } = useTheme();
  const flat = StyleSheet.flatten(style as StyleProp<ViewStyle>) as Record<string, unknown> | undefined;
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role={accessibilityLabel ? 'img' : undefined}
      aria-label={accessibilityLabel}
      aria-hidden={accessibilityLabel ? undefined : true}
      style={{ color: color ?? palette.text, flexShrink: 0, display: 'block', ...(flat as object) }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

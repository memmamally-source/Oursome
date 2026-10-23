import type { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useTheme } from '@/theme';

import { ICONS, type IconName } from './icons.generated';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Native: inline SVG icons (only the ones the app uses are bundled). */
export function Icon({ name, size = 20, color, style, accessibilityLabel }: IconProps) {
  const { palette } = useTheme();
  return (
    <SvgXml
      xml={`<svg viewBox="0 0 512 512">${ICONS[name]}</svg>`}
      width={size}
      height={size}
      color={color ?? palette.text}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
    />
  );
}

import { Text as RNText, type TextProps } from 'react-native';

import { typography, useTheme, type AccentKey, type TypeVariant } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'onAccent' | 'danger' | AccentKey;

type Props = TextProps & {
  variant?: TypeVariant;
  tone?: TextTone;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

/** Themed text. Accent tones use the accessible `ink` shade. */
export function Text({ variant = 'body', tone = 'primary', color, align, style, ...rest }: Props) {
  const { palette } = useTheme();
  const toneColor =
    tone === 'primary'
      ? palette.text
      : tone === 'secondary'
        ? palette.textSecondary
        : tone === 'tertiary'
          ? palette.textTertiary
          : tone === 'onAccent'
            ? palette.onAccent
            : tone === 'danger'
              ? palette.danger
              : palette.accents[tone].ink;
  return (
    <RNText
      maxFontSizeMultiplier={variant === 'display' || variant === 'number' ? 1.3 : 1.8}
      {...rest}
      style={[typography[variant], { color: color ?? toneColor }, align && { textAlign: align }, style]}
    />
  );
}

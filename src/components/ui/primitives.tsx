import { Icon } from './Icon';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import type { IconName } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { elevation, fonts, radius, space, useTheme, type AccentKey } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Icon inside a softly tinted circle or rounded square. */
export function IconBubble({
  name,
  accent,
  size = 40,
  shape = 'circle',
  solid,
}: {
  name: IconName;
  accent: AccentKey;
  size?: number;
  shape?: 'circle' | 'square';
  solid?: boolean;
}) {
  const { accent: a } = useTheme();
  const tone = a(accent);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? size / 2 : size * 0.32,
        backgroundColor: solid ? tone.base : tone.soft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={name} size={size * 0.5} color={solid ? tone.on : tone.ink} />
    </View>
  );
}

type CardProps = {
  children: ReactNode;
  tint?: AccentKey;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  elevated?: boolean;
};

export function Card({ children, tint, style, padded = true, onPress, accessibilityLabel, elevated = true }: CardProps) {
  const { palette } = useTheme();
  const base: ViewStyle = {
    // Stationery: ivory paper with a fine warm edge and a soft resting shadow.
    backgroundColor: tint ? palette.accents[tint].soft : palette.surface,
    borderRadius: radius.xl,
    padding: padded ? space.lg : 0,
    ...(elevated && !tint ? elevation(palette, 1) : null),
    ...(!tint ? { borderWidth: 1, borderColor: palette.border } : null),
  };
  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
  accent?: AccentKey;
  icon?: IconName;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  accent = 'coral',
  icon,
  size = 'md',
  disabled,
  loading,
  style,
  fullWidth,
  accessibilityHint,
}: ButtonProps) {
  const { palette } = useTheme();
  const tone = palette.accents[accent];
  const bg =
    variant === 'primary'
      ? tone.base
      : variant === 'soft'
        ? tone.soft
        : variant === 'secondary'
          ? palette.surfaceAlt
          : variant === 'danger'
            ? palette.dangerSoft
            : 'transparent';
  const fg =
    variant === 'primary'
      ? tone.on
      : variant === 'soft'
        ? tone.ink
        : variant === 'danger'
          ? palette.danger
          : variant === 'ghost'
            ? tone.ink
            : palette.text;
  const height = size === 'lg' ? 56 : size === 'sm' ? 36 : 48;
  return (
    <PressableScale
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[
        {
          height,
          minHeight: height,
          paddingHorizontal: size === 'sm' ? space.md : space.xl,
          borderRadius: radius.pill,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant === 'primary' && elevation(palette, 1),
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
          <Text variant={size === 'sm' ? 'callout' : 'bodyStrong'} color={fg} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  accent,
  size = 40,
  variant = 'surface',
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  accent?: AccentKey;
  size?: number;
  variant?: 'surface' | 'soft' | 'solid' | 'plain';
}) {
  const { palette } = useTheme();
  const tone = accent ? palette.accents[accent] : undefined;
  const bg =
    variant === 'solid'
      ? (tone?.base ?? palette.text)
      : variant === 'soft'
        ? (tone?.soft ?? palette.surfaceAlt)
        : variant === 'surface'
          ? palette.surface
          : 'transparent';
  const fg = variant === 'solid' ? (tone?.on ?? palette.background) : (tone?.ink ?? palette.text);
  return (
    <PressableScale
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      accessibilityLabel={label}
      hitSlop={8}
      scaleTo={0.92}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        variant === 'surface' && elevation(palette, 1),
      ]}>
      <Icon name={icon} size={size * 0.5} color={fg} />
    </PressableScale>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  accent = 'coral',
  icon,
  dot,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accent?: AccentKey;
  icon?: IconName;
  dot?: AccentKey;
  small?: boolean;
}) {
  const { palette } = useTheme();
  const tone = palette.accents[accent];
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      accessibilityRole="button"
      aria-selected={!!selected}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: small ? 12 : 14,
        height: small ? 32 : 38,
        borderRadius: radius.pill,
        backgroundColor: selected ? tone.soft : palette.surface,
        borderWidth: 1,
        borderColor: selected ? tone.base : palette.border,
        opacity: pressed ? 0.8 : 1,
      })}
      hitSlop={small ? 6 : 3}>
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accents[dot].base }} /> : null}
      {icon ? <Icon name={icon} size={15} color={selected ? tone.ink : palette.textSecondary} /> : null}
      <Text variant="callout" color={selected ? tone.ink : palette.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({ label, accent = 'lavender', icon }: { label: string; accent?: AccentKey; icon?: IconName }) {
  const { palette } = useTheme();
  const tone = palette.accents[accent];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: tone.soft,
      }}>
      {icon ? <Icon name={icon} size={12} color={tone.ink} /> : null}
      <Text variant="caption" color={tone.ink} style={{ fontFamily: fonts.bodyBold, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

export function Avatar({ name, accent, size = 32, ring }: { name: string; accent: AccentKey; size?: number; ring?: boolean }) {
  const { palette } = useTheme();
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.accents[accent].base,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2.5 : 0,
        borderColor: palette.surface,
      }}>
      <Text variant="callout" color={palette.accents[accent].on} style={{ fontFamily: fonts.display, fontSize: size * 0.4, lineHeight: size * 0.5 }}>
        {initials}
      </Text>
    </View>
  );
}

export function AvatarStack({ people, size = 30 }: { people: { name: string; color: AccentKey }[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.map((p, i) => (
        <View key={p.name + i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar name={p.name} accent={p.color} size={size} ring />
        </View>
      ))}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  icon,
  accent,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
  accent?: AccentKey;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>
        {icon ? <Icon name={icon} size={18} color={accent ? palette.accents[accent].ink : palette.text} /> : null}
        <Text variant="heading" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" accessibilityLabel={action}>
          <Text variant="callout" tone="coral">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  error,
  style,
  icon,
  ...rest
}: TextInputProps & { label?: string; error?: string | null; icon?: IconName }) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="callout" tone="secondary">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: palette.surface,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? palette.danger : focused ? palette.accents.coral.base : palette.border,
          paddingHorizontal: space.md,
        }}>
        {icon ? <Icon name={icon} size={18} color={palette.textTertiary} /> : null}
        <TextInput
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel={label ?? rest.placeholder}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              minHeight: rest.multiline ? 88 : 50,
              paddingVertical: rest.multiline ? 12 : 0,
              fontFamily: fonts.body,
              fontSize: 16,
              color: palette.text,
              textAlignVertical: rest.multiline ? 'top' : 'center',
            },
            style,
          ]}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent = 'coral',
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  accent?: AccentKey;
}) {
  const { palette } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: palette.surfaceSunken, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            aria-selected={active}
            accessibilityLabel={o.label}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            style={[
              {
                flex: 1,
                height: 36,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                backgroundColor: active ? palette.surface : 'transparent',
                borderWidth: 1,
                borderColor: active ? palette.border : 'transparent',
              },
              active && elevation(palette, 1),
            ]}>
            {o.icon ? <Icon name={o.icon} size={15} color={active ? palette.accents[accent].ink : palette.textSecondary} /> : null}
            <Text variant="callout" color={active ? palette.text : palette.textSecondary} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingRow({
  icon,
  accent = 'lavender',
  label,
  detail,
  value,
  onValueChange,
  onPress,
  destructive,
}: {
  icon?: IconName;
  accent?: AccentKey;
  label: string;
  detail?: string;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { palette } = useTheme();
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 52 }}>
      {icon ? <IconBubble name={icon} accent={accent} size={34} shape="square" /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="body" tone={destructive ? 'danger' : 'primary'}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
      {onValueChange ? (
        <Switch
          value={!!value}
          onValueChange={(v) => {
            haptic.tap();
            onValueChange(v);
          }}
          accessibilityLabel={label}
          trackColor={{ true: palette.accents.coral.base, false: palette.border }}
          thumbColor={palette.surface}
          ios_backgroundColor={palette.border}
        />
      ) : onPress ? (
        <Icon name="chevron-forward" size={18} color={palette.textTertiary} />
      ) : null}
    </View>
  );
  if (onPress && !onValueChange) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { palette } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: inset }} />;
}

export function Row({ children, gap = space.sm, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

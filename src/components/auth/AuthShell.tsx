import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Wordmark } from '@/components/brand/Logo';
import { Screen, Text } from '@/components/ui';
import { space, useTheme } from '@/theme';

/** Shared frame for sign-in / sign-up: brand, heading and a soft colour wash. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <Screen>
      <View
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: palette.accents.sunshine.soft,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 40,
          left: -100,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: palette.accents.coral.soft,
        }}
      />
      <View style={{ marginTop: space.xl, marginBottom: space.xxxl }}>
        <Wordmark size={28} />
      </View>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" tone="secondary" style={{ marginTop: space.sm, marginBottom: space.xxl }}>
        {subtitle}
      </Text>
      <View style={{ gap: space.lg }}>{children}</View>
      {footer ? <View style={{ marginTop: space.xxl, alignItems: 'center', gap: space.md }}>{footer}</View> : null}
    </Screen>
  );
}

export function PreviewNotice() {
  const { palette } = useTheme();
  return (
    <View style={{ backgroundColor: palette.accents.lavender.soft, borderRadius: 14, padding: space.md }}>
      <Text variant="caption" tone="lavender">
        Preview build: your account and data are stored on this device only. Secure cloud accounts and sync arrive in the next update.
      </Text>
    </View>
  );
}

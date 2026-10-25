import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Wordmark } from '@/components/brand/Logo';
import { Screen, Text } from '@/components/ui';
import { cloudConfigured } from '@/features/cloud/config';
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
        {cloudConfigured
          ? 'Your account is secured with Firebase. Things you share with your family sync to their devices; everything else stays private.'
          : 'This copy of Oursome keeps your account and data on this device only. Cloud accounts and family sharing switch on once they’re set up.'}
      </Text>
    </View>
  );
}

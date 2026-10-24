import { Icon } from './Icon';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout } from '@/hooks/useLayout';
import { fonts, layout, space, useTheme } from '@/theme';

import { Text } from './Text';

/** Bottom padding that clears the floating tab bar (none needed beside the desktop sidebar). */
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  if (isWide) return space.huge;
  return layout.tabBarHeight + layout.tabBarMargin + Math.max(insets.bottom, 12) + space.xxxl;
}

type ScreenProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  /** Set on tab screens so content clears the floating tab bar. */
  tabBar?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
  /** Allow a wider content column on desktop (two-column layouts). */
  wide?: boolean;
} & Pick<ScrollViewProps, 'refreshControl' | 'stickyHeaderIndices'>;

export function Screen({ children, title, subtitle, right, tabBar, scroll = true, contentStyle, background, wide, ...rest }: ScreenProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const header = title ? (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.xl, gap: space.md }}>
      <View style={{ flex: 1 }}>
        {subtitle ? (
          <Text variant="overline" tone="secondary" style={{ marginBottom: 2 }}>
            {subtitle}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  ) : null;

  const padding: ViewStyle = {
    paddingTop: insets.top + space.lg,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: tabBar ? clearance : insets.bottom + space.xxxl,
    width: '100%',
    maxWidth: wide ? layout.maxWideContentWidth : layout.maxContentWidth,
    alignSelf: 'center',
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: background ?? palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...rest}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>
          {header}
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Header row for modal / sheet screens: Cancel · Title · Action. */
export function ModalHeader({
  title,
  onClose,
  action,
  onAction,
  actionDisabled,
}: {
  title: string;
  onClose?: () => void;
  action?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: space.md,
        marginBottom: space.md,
      }}>
      <Pressable
        onPress={onClose ?? (() => router.back())}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: palette.surfaceSunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="close" size={20} color={palette.text} />
      </Pressable>
      <Text
        variant="subheading"
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flex: 1, textAlign: 'center', marginHorizontal: space.sm }}>
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={onAction}
          disabled={actionDisabled}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={action}
          accessibilityState={{ disabled: !!actionDisabled }}
          style={{
            paddingHorizontal: 16,
            height: 36,
            borderRadius: 18,
            backgroundColor: actionDisabled ? palette.surfaceSunken : palette.accents.coral.base,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            variant="callout"
            color={actionDisabled ? palette.textTertiary : palette.onAccent}
            style={{ fontFamily: fonts.bodyBold }}>
            {action}
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </View>
  );
}

/** Container for modal routes: themed background, padding, keyboard handling. */
export function ModalScreen({ children, header }: { children: ReactNode; header: ReactNode }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: Platform.OS === 'android' ? insets.top + space.sm : space.sm,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}>
        {header}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingBottom: insets.bottom + space.huge,
          gap: space.xl,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

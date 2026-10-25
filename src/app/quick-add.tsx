import { Icon } from '@/components/ui/Icon';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureBox } from '@/components/assistant/CaptureBox';
import { Text } from '@/components/ui';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import type { IconName } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { fonts, layout, radius, space, useTheme, type AccentKey } from '@/theme';

type Action = { label: string; hint: string; icon: IconName; accent: AccentKey; href: () => Href };

export default function QuickAdd() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const hasSpace = useSpace((s) => !!s.space);
  // Opened from the Calendar tab: add on the day picked there.
  const { date } = useLocalSearchParams<{ date?: string }>();
  const on = date ? { date } : {};

  const go = (href: Href) => {
    haptic.tap();
    router.back();
    // Let the sheet dismiss before presenting the next screen.
    setTimeout(() => router.push(href), 250);
  };

  const actions: Action[] = [
    {
      label: 'Task',
      hint: 'Something to do',
      icon: 'checkmark-circle',
      accent: 'mint',
      href: () => ({ pathname: '/task/[id]', params: { id: 'new', ...on } }),
    },
    {
      label: 'Appointment',
      hint: 'Add to calendar',
      icon: 'calendar',
      accent: 'sky',
      href: () => ({ pathname: '/event/[id]', params: { id: 'new', ...on } }),
    },
    {
      label: 'Reminder',
      hint: 'Get a nudge',
      icon: 'notifications',
      accent: 'sunshine',
      href: () => ({ pathname: '/task/[id]', params: { id: 'new', reminder: '1', ...on } }),
    },
    {
      label: 'Shopping item',
      hint: 'Add to a list',
      icon: 'basket',
      accent: 'mint',
      href: () => {
        const first = useShopping.getState().lists[0];
        return first ? { pathname: '/shopping/[id]', params: { id: first.id } } : { pathname: '/tasks', params: { view: 'lists' } };
      },
    },
    { label: 'Import', hint: 'Screenshot or document', icon: 'scan', accent: 'lavender', href: () => '/import' },
    hasSpace
      ? { label: 'Invite', hint: 'Bring someone in', icon: 'person-add', accent: 'coral', href: () => '/space' }
      : { label: 'Our Space', hint: 'Share with people', icon: 'people', accent: 'coral', href: () => '/space-create' },
  ];

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: layout.screenPadding,
        paddingTop: space.xxl,
        paddingBottom: insets.bottom + space.xl,
        gap: space.xl,
        backgroundColor: palette.background,
        maxWidth: layout.maxContentWidth,
        width: '100%',
        alignSelf: 'center',
      }}>
      <Text variant="title" accessibilityRole="header">
        Add or ask
      </Text>
      <CaptureBox autoFocus />
      <Text variant="overline" tone="tertiary">
        Or add it yourself
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {actions.map((a) => {
          const tone = palette.accents[a.accent];
          return (
            <Pressable
              key={a.label}
              onPress={() => go(a.href())}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              accessibilityHint={a.hint}
              style={({ pressed }) => ({
                width: '30%',
                flexGrow: 1,
                backgroundColor: tone.soft,
                borderRadius: radius.lg,
                paddingVertical: space.lg,
                alignItems: 'center',
                gap: space.sm,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  backgroundColor: tone.base,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon name={a.icon} size={22} color={tone.on} />
              </View>
              <Text variant="callout" color={tone.ink} style={{ fontFamily: fonts.bodyBold }} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

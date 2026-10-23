import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import type { IconName } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { fonts, layout, radius, space, useTheme, type AccentKey } from '@/theme';

type Action = { label: string; hint: string; icon: IconName; accent: AccentKey; href: () => Href };

export default function QuickAdd() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const hasSpace = useSpace((s) => !!s.space);

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
      href: () => ({ pathname: '/task/[id]', params: { id: 'new' } }),
    },
    {
      label: 'Appointment',
      hint: 'Add to calendar',
      icon: 'calendar',
      accent: 'sky',
      href: () => ({ pathname: '/event/[id]', params: { id: 'new' } }),
    },
    {
      label: 'Reminder',
      hint: 'Get a nudge',
      icon: 'notifications',
      accent: 'sunshine',
      href: () => ({ pathname: '/task/[id]', params: { id: 'new', reminder: '1' } }),
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

  const capture = () => {
    const value = text.trim();
    if (!value) return;
    router.back();
    setTimeout(() => router.navigate({ pathname: '/assistant', params: { prompt: value, t: Date.now().toString() } }), 250);
  };

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
        Add something
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: palette.surface,
          borderRadius: radius.xl,
          paddingLeft: space.lg,
          paddingRight: 6,
          minHeight: 58,
          borderWidth: 1.5,
          borderColor: palette.accents.lavender.soft,
        }}>
        <Ionicons name="sparkles" size={20} color={palette.accents.lavender.base} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={capture}
          returnKeyType="send"
          placeholder="Just type it — “Pay rent by the 1st”"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="Quick capture"
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.text, paddingVertical: space.md }}
        />
        <IconButton icon="arrow-up" label="Capture" variant="solid" accent="lavender" size={44} onPress={capture} />
      </View>
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
                <Ionicons name={a.icon} size={22} color={palette.onAccent} />
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

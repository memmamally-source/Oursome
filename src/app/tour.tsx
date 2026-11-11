import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/icons.generated';
import { Button, Text } from '@/components/ui';
import { cloudConfigured } from '@/features/cloud';
import { useSettings } from '@/features/settings/store';
import { space, useTheme, type AccentKey } from '@/theme';

type Step = { key: string; accent: AccentKey; title: string; body: string } & (
  | { art: IllustrationName; icon?: never }
  | { icon: IconName; art?: never }
);

/** How-to steps, in the order people usually need them. */
const steps: Step[] = [
  {
    key: 'plus',
    icon: 'add',
    accent: 'coral',
    title: 'The big + adds anything',
    body: 'Tap the brown + at the bottom of the screen to add an event, a task, a shopping item or a note for the day.',
  },
  {
    key: 'calendar',
    art: 'calendar',
    accent: 'sky',
    title: 'One calendar for everyone',
    body: 'Each person has their own colour. Swipe left or right to change days, and pick a day before tapping + to add to it.',
  },
  {
    key: 'tasks',
    art: 'checklist',
    accent: 'mint',
    title: 'Tasks and reminders',
    body: 'In Tasks, give jobs to someone and make them repeat. Reminders arrive as notifications, even with the app closed.',
  },
  {
    key: 'shopping',
    art: 'basket',
    accent: 'sunshine',
    title: 'Shopping lists',
    body: 'Tasks → Shopping. Items sort themselves by aisle, and you can tap a list’s name to rename it.',
  },
  {
    key: 'albums',
    icon: 'images-outline',
    accent: 'lavender',
    title: 'Photo albums',
    body: 'Our Space → Photo albums. Choose your photos, name the album and tap Create. Change layouts, captions and the cover any time.',
  },
  ...(cloudConfigured
    ? [
        {
          key: 'share',
          art: 'together' as const,
          accent: 'sunshine' as const,
          title: 'Share with your family',
          body: 'Our Space → open your family → Share this family. Then make an invite code and send the link to the people you live with.',
        },
      ]
    : []),
  {
    key: 'organiser',
    art: 'assistant',
    accent: 'lavender',
    title: 'Or just type it',
    body: 'Tell the organiser “Dentist on Tuesday at 3pm” and it sets it up for you. It always checks with you first.',
  },
];

/** A short how-to tour: shown once after signing in, and any time from Settings → Help. */
export default function Tour() {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Step>>(null);
  const markSeen = useSettings((s) => s.completeTour);
  const isLast = index === steps.length - 1;

  const finish = () => {
    markSeen();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goTo = (i: number) => {
    listRef.current?.scrollToOffset({ offset: i * width, animated: true });
    setIndex(i);
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: palette.background, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl }}>
        <Text variant="subheading">How Oursome works</Text>
        {!isLast ? (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip the tour">
            <Text variant="callout" tone="secondary">
              Skip
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={steps}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== index && next >= 0 && next < steps.length) setIndex(next);
        }}
        renderItem={({ item }) => (
          <View style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxxl, gap: space.lg }}>
            <View
              style={{
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: palette.accents[item.accent].soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {item.icon ? (
                <View
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 56,
                    backgroundColor: item.key === 'plus' ? palette.accents.coral.base : palette.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name={item.icon} size={56} color={item.key === 'plus' ? '#FFFFFF' : palette.accents[item.accent].ink} />
                </View>
              ) : (
                <Illustration name={item.art} width={200} />
              )}
            </View>
            <Text variant="title" align="center" style={{ marginTop: space.md }}>
              {item.title}
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 360 }}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View
        style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: space.xl }}
        accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <View
            key={s.key}
            style={{
              width: i === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === index ? palette.accents[steps[index].accent].base : palette.border,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: space.xl, gap: space.sm, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        <Button label={isLast ? 'Start using Oursome' : 'Next'} size="lg" fullWidth onPress={() => (isLast ? finish() : goTo(index + 1))} />
        {index > 0 ? <Button label="Back" variant="ghost" fullWidth onPress={() => goTo(index - 1)} /> : null}
      </View>
    </View>
  );
}

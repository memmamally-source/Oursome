import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Logo';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { Button, Text } from '@/components/ui';
import { Brand } from '@/config/brand';
import { useSettings } from '@/features/settings/store';
import { space, useTheme, type AccentKey } from '@/theme';

const slides: { key: string; illustration: IllustrationName; accent: AccentKey; title: string; body: string }[] = [
  {
    key: 'one-place',
    illustration: 'sun',
    accent: 'sunshine',
    title: 'Your whole day,\nbeautifully simple',
    body: 'Appointments, tasks, reminders and lists — together in one calm, colourful place.',
  },
  {
    key: 'together',
    illustration: 'together',
    accent: 'coral',
    title: 'Better together',
    body: 'Share calendars, chores and shopping with the people you live with. Private things stay private.',
  },
  {
    key: 'assistant',
    illustration: 'assistant',
    accent: 'lavender',
    title: 'Just say it',
    body: '“Dentist Tuesday at 3.” Oursome turns everyday words into plans — and always checks with you first.',
  },
];

export default function Onboarding() {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const complete = useSettings((s) => s.completeOnboarding);
  const isLast = index === slides.length - 1;

  const finish = (to: '/sign-up' | '/sign-in') => {
    complete();
    router.replace(to);
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: palette.background, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl }}>
        <Wordmark size={24} />
        {!isLast ? (
          <Pressable onPress={() => finish('/sign-up')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip introduction">
            <Text variant="callout" tone="secondary">
              Skip
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== index && next >= 0 && next < slides.length) setIndex(next);
        }}
        renderItem={({ item }) => (
          <View style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxxl, gap: space.lg }}>
            <View
              style={{
                width: 280,
                height: 280,
                borderRadius: 140,
                backgroundColor: palette.accents[item.accent].soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Illustration name={item.illustration} width={240} />
            </View>
            <Text variant="display" align="center" style={{ marginTop: space.lg }}>
              {item.title}
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 340 }}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View
        style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: space.xl }}
        accessibilityLabel={`Page ${index + 1} of ${slides.length}`}>
        {slides.map((s, i) => (
          <View
            key={s.key}
            style={{
              width: i === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === index ? palette.accents[slides[index].accent].base : palette.border,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: space.xl, gap: space.md, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        {isLast ? (
          <Animated.View entering={FadeIn} style={{ gap: space.md }}>
            <Button label="Get started" size="lg" fullWidth onPress={() => finish('/sign-up')} />
            <Button label="I already have an account" variant="ghost" fullWidth onPress={() => finish('/sign-in')} />
          </Animated.View>
        ) : (
          <Button
            label="Next"
            size="lg"
            fullWidth
            onPress={() => {
              listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
              setIndex(index + 1);
            }}
          />
        )}
        <Text variant="caption" tone="tertiary" align="center">
          {Brand.tagline}
        </Text>
      </View>
    </View>
  );
}

import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Logo';
import { OrbRoll } from '@/components/brand/Orb';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { Button, Text } from '@/components/ui';
import { Brand } from '@/config/brand';
import { useSettings } from '@/features/settings/store';
import { space, useTheme, type AccentKey } from '@/theme';

type Art = IllustrationName | 'orb' | 'journal';

const slides: { key: string; art: Art; accent: AccentKey; title: string; body: string }[] = [
  {
    key: 'welcome',
    art: 'orb',
    accent: 'coral',
    title: 'Welcome home',
    body: 'One warm place for your household’s plans, lists and little moments.',
  },
  {
    key: 'together',
    art: 'together',
    accent: 'sunshine',
    title: 'Better together',
    body: 'Share calendars, chores and shopping with the people you live with. Private things stay private.',
  },
  {
    key: 'journal',
    art: 'journal',
    accent: 'mint',
    title: 'Keep the moments',
    body: 'A journal for the days worth remembering: photos, milestones and notes, page by page.',
  },
  {
    key: 'assistant',
    art: 'assistant',
    accent: 'lavender',
    title: 'Just say it',
    body: '“Dinner with my parents on Friday at 7.” Oursome turns everyday words into plans, and always checks with you first.',
  },
];

/** A little open book for the journal slide. */
function JournalArt() {
  const { palette } = useTheme();
  const page = {
    width: 96,
    height: 128,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 8,
  } as const;
  const line = (w: number) => <View style={{ height: 6, width: w, borderRadius: 3, backgroundColor: palette.border }} />;
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={[page, { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, transform: [{ rotate: '-3deg' }] }]}>
        <View style={{ height: 52, borderRadius: 4, backgroundColor: palette.accents.sunshine.soft }} />
        {line(60)}
        {line(44)}
      </View>
      <View style={[page, { borderTopRightRadius: 8, borderBottomRightRadius: 8, transform: [{ rotate: '3deg' }] }]}>
        <Text variant="caption" color={palette.accents.coral.ink}>
          ♥
        </Text>
        {line(64)}
        {line(52)}
        {line(58)}
      </View>
    </View>
  );
}

function SlideArt({ art }: { art: Art }) {
  if (art === 'orb') return <OrbRoll size={96} distance={120} />;
  if (art === 'journal') return <JournalArt />;
  return <Illustration name={art} width={240} />;
}

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
              <SlideArt art={item.art} />
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
          <View style={{ gap: space.md }}>
            <Button label="Get started" size="lg" fullWidth onPress={() => finish('/sign-up')} />
            <Button label="I already have an account" variant="ghost" fullWidth onPress={() => finish('/sign-in')} />
          </View>
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

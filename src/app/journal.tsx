import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { JournalPageView } from '@/components/journal/JournalPage';
import { PageTurn } from '@/components/journal/PageTurn';
import { Button, IconButton, Screen, Text } from '@/components/ui';
import { journalPages, pageIndexOf, visibleMemories } from '@/features/memories/logic';
import { useMemories } from '@/features/memories/store';
import { useSpace } from '@/features/space/store';
import { useLayout } from '@/hooks/useLayout';
import { layout, space } from '@/theme';

/** The household journal as a book: one page per memory, two side by side on wide screens. */
export default function JournalScreen() {
  const params = useLocalSearchParams<{ memory?: string }>();
  const { width, height, isTablet } = useLayout();
  const memories = useMemories((s) => s.memories);
  const household = useSpace((s) => s.space);
  const spaces = useSpace((s) => s.spaces);
  const visible = visibleMemories(memories, household?.id, spaces);

  const spread = width >= 820;
  const pages = journalPages(visible, spread);
  const [index, setIndex] = useState(() => pageIndexOf(pages, params.memory, spread));
  // Keep the page in range and aligned when the window changes shape or a page is removed.
  const shown = Math.min(spread ? index - (index % 2) : index, pages.length - (spread ? 2 : 1));

  const available = Math.min(width, layout.maxWideContentWidth) - layout.screenPadding * 2;
  const pageWidth = Math.floor(spread ? Math.min(available / 2, 440) : Math.min(available, 460));
  const pageHeight = Math.floor(Math.min(pageWidth * 1.38, Math.max(420, height - (isTablet ? 220 : 240))));

  return (
    <Screen wide>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/space'))} />
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
          Journal
        </Text>
        <Button label="Add a page" icon="add" size="sm" onPress={() => router.push({ pathname: '/memory/[id]', params: { id: 'new' } })} />
      </View>
      <PageTurn
        count={pages.length}
        index={shown}
        onIndexChange={setIndex}
        spread={spread}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        renderPage={(i) => <JournalPageView page={pages[i]} number={i} household={household} total={visible.length} />}
      />
    </Screen>
  );
}

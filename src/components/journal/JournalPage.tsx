import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { HouseholdCover, type CoverKey } from '@/components/home/HouseholdCover';
import type { JournalPage as Page } from '@/features/memories/logic';
import type { Space } from '@/features/types';
import { format, fromDateKey } from '@/lib/dates';
import { usePhoto } from '@/lib/photoStore';
import { fonts, paperProps, radius, space, useTheme } from '@/theme';

import { Icon } from '../ui/Icon';
import { Button } from '../ui/primitives';
import { Text } from '../ui/Text';

const kindLabel = { memory: 'Memory', milestone: 'Milestone', note: 'Note' } as const;

/** One sheet of the journal: ivory paper, a photo, the date and the words. */
export function JournalPageView({
  page,
  number,
  household,
  total,
}: {
  page: Page;
  number: number;
  household: Space | null;
  total: number;
}) {
  const { palette } = useTheme();
  const paper = { flex: 1, backgroundColor: palette.surface, padding: space.xl, gap: space.md, overflow: 'hidden' as const };

  if (page.kind === 'cover') {
    return (
      <View {...paperProps} style={[paper, { padding: 0 }]}>
        <HouseholdCover cover={(household?.cover as CoverKey) ?? 'hearth'} photo={household?.photo} />
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: space.xl, gap: space.sm }}>
          <Text variant="overline" color={palette.accents.coral.ink}>
            Our journal
          </Text>
          <Text variant="display">{household?.name ?? 'Our Home'}</Text>
          {household?.motto ? (
            <Text variant="body" tone="secondary">
              {household.motto}
            </Text>
          ) : null}
          <Text variant="caption" tone="secondary">
            {total ? `${total} ${total === 1 ? 'page' : 'pages'} so far · turn the page` : 'The first page is waiting'}
          </Text>
        </View>
      </View>
    );
  }

  if (page.kind === 'end' || page.kind === 'blank') {
    return (
      <View {...paperProps} style={[paper, { alignItems: 'center', justifyContent: 'center' }]}>
        {page.kind === 'end' ? (
          <>
            <Icon name="leaf-outline" size={28} color={palette.accents.mint.ink} />
            <Text variant="heading" align="center">
              The next page is yours
            </Text>
            <Text variant="callout" tone="secondary" align="center">
              A day out, a first, a funny thing someone said.
            </Text>
            <Button label="Add a page" icon="add" style={{ alignSelf: 'center', marginTop: space.sm }} onPress={() => router.push({ pathname: '/memory/[id]', params: { id: 'new' } })} />
          </>
        ) : null}
      </View>
    );
  }

  return <MemorySheet memory={page.memory} number={number} />;
}

function MemorySheet({ memory, number }: { memory: Extract<Page, { kind: 'memory' }>['memory']; number: number }) {
  const { palette } = useTheme();
  const photo = usePhoto(memory.photoId);
  const accent =
    memory.kind === 'milestone' ? palette.accents.sunshine : memory.kind === 'note' ? palette.accents.lavender : palette.accents.coral;
  return (
    <View {...paperProps} style={{ flex: 1, backgroundColor: palette.surface, padding: space.xl, gap: space.md, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text variant="overline" color={accent.ink} style={{ flex: 1 }}>
          {kindLabel[memory.kind]} · {format(fromDateKey(memory.date), 'd MMMM yyyy')}
        </Text>
        {memory.visibility === 'shared' ? <Icon name="people-outline" size={14} color={palette.textTertiary} /> : null}
        <Pressable
          onPress={() => router.push({ pathname: '/memory/[id]', params: { id: memory.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${memory.title}`}
          hitSlop={10}>
          <Icon name="create-outline" size={18} color={palette.textSecondary} />
        </Pressable>
      </View>
      {photo ? (
        <Image
          source={{ uri: photo }}
          contentFit="cover"
          accessibilityLabel={`Photo: ${memory.title}`}
          style={{
            width: '100%',
            aspectRatio: 4 / 3,
            borderRadius: radius.sm,
            borderWidth: 6,
            borderColor: palette.surfaceAlt,
            transform: [{ rotate: number % 2 ? '-1deg' : '1deg' }],
          }}
        />
      ) : null}
      <Text variant="title" style={{ fontFamily: fonts.display }}>
        {memory.title}
      </Text>
      {memory.body ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Text variant="body" tone="secondary" style={{ lineHeight: 26 }}>
            {memory.body}
          </Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Text variant="caption" tone="tertiary" align="center">
        {number}
      </Text>
    </View>
  );
}

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { HouseholdCover, type CoverKey } from '@/components/home/HouseholdCover';
import { timelineByYear, visibleMemories } from '@/features/memories/logic';
import { useMemories } from '@/features/memories/store';
import { useSpace } from '@/features/space/store';
import { format, fromDateKey } from '@/lib/dates';
import { elevation, radius, space, useTheme } from '@/theme';

import { Icon } from '../ui/Icon';
import { Button, SectionHeader } from '../ui/primitives';
import { Text } from '../ui/Text';

/** Our Space's scrapbook: the journal's cover and a timeline of moments and milestones. */
export function JournalSection() {
  const { palette } = useTheme();
  const memories = useMemories((s) => s.memories);
  const household = useSpace((s) => s.space);
  const spaces = useSpace((s) => s.spaces);
  const visible = visibleMemories(memories, household?.id, spaces);
  const timeline = timelineByYear(visible);
  const recent = timeline.flatMap((g) => g.items).slice(0, 6);
  const add = (kind: 'memory' | 'milestone') => router.push({ pathname: '/memory/[id]', params: { id: 'new', kind } });

  return (
    <View style={{ marginBottom: space.xxl }}>
      <SectionHeader title="Journal" icon="book-outline" accent="coral" />
      <Pressable
        onPress={() => router.push('/journal')}
        accessibilityRole="button"
        accessibilityLabel={`Open the journal, ${visible.length} pages`}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            borderRadius: radius.xl,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
            opacity: pressed ? 0.85 : 1,
          },
          elevation(palette, 1),
        ]}>
        {/* A little book: cover art with a spine. */}
        <View
          style={{
            width: 92,
            height: 120,
            margin: space.md,
            borderRadius: 4,
            overflow: 'hidden',
            borderLeftWidth: 6,
            borderLeftColor: palette.accents.coral.base,
          }}>
          <HouseholdCover cover={(household?.cover as CoverKey) ?? 'hearth'} photo={household?.photo} />
        </View>
        <View style={{ flex: 1, paddingVertical: space.lg, paddingRight: space.lg, gap: 4, justifyContent: 'center' }}>
          <Text variant="heading">{household ? `${household.name}’s journal` : 'Your journal'}</Text>
          <Text variant="callout" tone="secondary">
            {visible.length
              ? `${visible.length} ${visible.length === 1 ? 'page' : 'pages'}. Open it and turn the pages.`
              : 'Keep the moments worth remembering, page by page.'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text variant="callout" tone="coral">
              Open the journal
            </Text>
            <Icon name="arrow-forward" size={14} color={palette.accents.coral.ink} />
          </View>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' }}>
        <Button label="Add a memory" icon="heart-outline" variant="soft" accent="coral" size="sm" onPress={() => add('memory')} />
        <Button label="Add a milestone" icon="flag-outline" variant="soft" accent="sunshine" size="sm" onPress={() => add('milestone')} />
      </View>

      {recent.length ? (
        <View style={{ marginTop: space.lg, gap: 0 }} role="list" aria-label="Timeline">
          {recent.map((m, i) => {
            const year = m.date.slice(0, 4);
            const newYear = i === 0 || recent[i - 1].date.slice(0, 4) !== year;
            const dot = m.kind === 'milestone' ? palette.accents.sunshine : palette.accents.coral;
            return (
              <View key={m.id} role="listitem">
                {newYear ? (
                  <Text variant="overline" tone="secondary" style={{ marginTop: i ? space.md : 0, marginBottom: space.xs }}>
                    {year}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => router.push({ pathname: '/journal', params: { memory: m.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.title}, ${format(fromDateKey(m.date), 'd MMMM yyyy')}`}
                  style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ alignItems: 'center', width: 14 }}>
                    <View style={{ width: 2, flex: 1, backgroundColor: i && !newYear ? palette.border : 'transparent' }} />
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: dot.base,
                        borderWidth: m.kind === 'milestone' ? 0 : 2,
                        borderColor: palette.surface,
                      }}
                    />
                    <View
                      style={{
                        width: 2,
                        flex: 1,
                        backgroundColor: recent[i + 1]?.date.slice(0, 4) === year ? palette.border : 'transparent',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, paddingVertical: space.sm }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {m.title}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {format(fromDateKey(m.date), 'd MMMM')}
                      {m.kind === 'milestone' ? ' · Milestone' : ''}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

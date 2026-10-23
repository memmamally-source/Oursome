import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';

import { layoutDay } from '@/features/calendar/layout';
import { useCalendar } from '@/features/calendar/store';
import type { EventOccurrence } from '@/features/types';
import { format, formatTime, fromDateKey, minutesOfDay, timeFromMinutes, timeKeyOf, type DateKey } from '@/lib/dates';
import { fonts, radius, useTheme } from '@/theme';

import { Text } from '../ui/Text';

const HOUR = 56;
const GUTTER = 46;

type Props = {
  days: DateKey[];
  occurrences: Record<DateKey, EventOccurrence[]>;
  today: DateKey;
  nowTime: string;
  height: number;
};

/**
 * Scrollable time grid for one (Day) or seven (Week) columns. Overlapping
 * events sit side by side; tapping an empty slot starts a new event there.
 */
export function TimeGrid({ days, occurrences, today, nowTime, height }: Props) {
  const { palette } = useTheme();
  const calendars = useCalendar((s) => s.calendars);
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const columnWidth = width ? (width - GUTTER) / days.length : 0;
  const compact = days.length > 1;

  useEffect(() => {
    const target = days.includes(today) ? Math.max(0, minutesOfDay(nowTime) / 60 - 1.5) : 7.5;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: target * HOUR, animated: false }), 50);
    return () => clearTimeout(id);
    // Only on first mount and when switching day ranges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join()]);

  const colour = (calendarId: string) => calendars.find((c) => c.id === calendarId)?.color ?? 'sky';

  return (
    <View
      style={{ height, borderRadius: radius.xl, backgroundColor: palette.surface, overflow: 'hidden' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ height: HOUR * 24 + 16 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <View
            key={h}
            style={{ position: 'absolute', top: h * HOUR + 8, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text
              variant="caption"
              color={palette.textTertiary}
              style={{ width: GUTTER - 6, textAlign: 'right', fontSize: 11, marginTop: -8 }}>
              {h === 0 ? '' : formatTime(timeFromMinutes(h * 60)).replace(':00', '')}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border, marginLeft: 6, opacity: 0.7 }} />
          </View>
        ))}

        {width
          ? days.map((date, col) => {
              const placed = layoutDay(occurrences[date] ?? [], date);
              const left = GUTTER + col * columnWidth;
              return (
                <View key={date} style={{ position: 'absolute', top: 8, left, width: columnWidth, height: HOUR * 24 }}>
                  <Pressable
                    accessibilityLabel={`Add event on ${format(fromDateKey(date), 'EEEE d MMMM')}`}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    onPress={(e) => {
                      const minutes = Math.floor(e.nativeEvent.locationY / HOUR) * 60;
                      router.push({ pathname: '/event/[id]', params: { id: 'new', date, time: timeFromMinutes(minutes) } });
                    }}
                  />
                  {col > 0 ? (
                    <View
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: palette.border, opacity: 0.5 }}
                    />
                  ) : null}
                  {date === today ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: -4,
                        right: 0,
                        top: (minutesOfDay(nowTime) / 60) * HOUR - 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accents.coral.base }} />
                      <View style={{ flex: 1, height: 2, backgroundColor: palette.accents.coral.base }} />
                    </View>
                  ) : null}
                  {placed.map((p) => {
                    const tone = palette.accents[colour(p.occurrence.event.calendarId)];
                    const w = columnWidth / p.columns;
                    const h = Math.max(((p.endMin - p.startMin) / 60) * HOUR - 2, 20);
                    return (
                      <Pressable
                        key={p.occurrence.key}
                        onPress={() => router.push({ pathname: '/event/[id]', params: { id: p.occurrence.event.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={`${p.occurrence.event.title}, ${formatTime(timeKeyOf(p.occurrence.start))}`}
                        style={{
                          position: 'absolute',
                          top: (p.startMin / 60) * HOUR + 1,
                          left: p.column * w + 2,
                          width: w - 4,
                          height: h,
                          backgroundColor: tone.soft,
                          borderLeftWidth: 3,
                          borderLeftColor: tone.base,
                          borderRadius: 8,
                          paddingHorizontal: compact ? 3 : 8,
                          paddingVertical: 3,
                          overflow: 'hidden',
                        }}>
                        <Text
                          numberOfLines={compact ? 3 : 1}
                          style={{
                            fontFamily: fonts.bodyBold,
                            fontSize: compact ? 9 : 13,
                            lineHeight: compact ? 11 : 17,
                            color: tone.ink,
                          }}>
                          {p.occurrence.event.title}
                        </Text>
                        {!compact && h > 36 ? (
                          <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: tone.ink }}>
                            {formatTime(timeKeyOf(p.occurrence.start))}
                            {p.occurrence.event.location ? ` · ${p.occurrence.event.location}` : ''}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })
          : null}
      </ScrollView>
    </View>
  );
}

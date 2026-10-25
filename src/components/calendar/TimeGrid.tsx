import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';

import { layoutDay } from '@/features/calendar/layout';
import { useCalendar } from '@/features/calendar/store';
import { TASKS_CALENDAR_ID } from '@/features/calendar/tasks';
import type { EventOccurrence } from '@/features/types';
import { format, formatTime, fromDateKey, minutesOfDay, timeFromMinutes, timeKeyOf, type DateKey } from '@/lib/dates';
import { fonts, radius, useTheme } from '@/theme';

import { Text } from '../ui/Text';

import { openOccurrence } from './EventCard';

const HOUR = 56;
const GUTTER = 46;

type Props = {
  days: DateKey[];
  occurrences: Record<DateKey, EventOccurrence[]>;
  today: DateKey;
  nowTime: string;
  /** Fixed height; fills its parent when omitted. */
  height?: number;
  /** Tapping a column's date header (e.g. to open that single day). */
  onSelectDay?: (date: DateKey) => void;
};

/**
 * Scrollable time grid for one, three or seven day columns, with date
 * headers and all-day events pinned above. Overlapping events sit side by
 * side; tapping an empty slot starts a new event there.
 */
export function TimeGrid({ days, occurrences, today, nowTime, height, onSelectDay }: Props) {
  const { palette } = useTheme();
  const calendars = useCalendar((s) => s.calendars);
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const columnWidth = width ? (width - GUTTER) / days.length : 0;
  // Narrow columns (a phone week) get small type; three days on a phone still read comfortably.
  const compact = columnWidth > 0 && columnWidth < 90;
  const multi = days.length > 1;
  const allDay = days.map((d) => (occurrences[d] ?? []).filter((o) => o.event.allDay));
  const hasAllDay = allDay.some((list) => list.length);

  useEffect(() => {
    // Start near now, but never in the small hours: mornings matter more at 3 AM.
    const target = days.includes(today) ? Math.max(7, minutesOfDay(nowTime) / 60 - 1.5) : 7.5;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: target * HOUR, animated: false }), 50);
    return () => clearTimeout(id);
    // Only on first mount and when switching day ranges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join()]);

  const colour = (calendarId: string) =>
    calendarId === TASKS_CALENDAR_ID ? 'mint' : (calendars.find((c) => c.id === calendarId)?.color ?? 'sky');

  return (
    <View
      style={{ ...(height ? { height } : { flex: 1 }), borderRadius: radius.xl, backgroundColor: palette.surface, overflow: 'hidden' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {multi || hasAllDay ? (
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 6 }}>
          <View style={{ width: GUTTER, justifyContent: 'flex-end', paddingBottom: 4 }}>
            {hasAllDay ? (
              <Text variant="caption" color={palette.textTertiary} style={{ fontSize: 10, textAlign: 'right', paddingRight: 6 }}>
                all day
              </Text>
            ) : null}
          </View>
          {days.map((date, col) => {
            const isToday = date === today;
            const d = fromDateKey(date);
            return (
              <View key={date} style={{ flex: 1, alignItems: 'stretch', gap: 4, paddingHorizontal: 2 }}>
                {multi ? (
                  <Pressable
                    onPress={() => onSelectDay?.(date)}
                    accessibilityRole="button"
                    accessibilityLabel={format(d, 'EEEE d MMMM')}
                    style={{ alignItems: 'center', gap: 1 }}>
                    <Text
                      variant="caption"
                      color={isToday ? palette.accents.coral.ink : palette.textSecondary}
                      style={{ fontFamily: fonts.bodyBold, fontSize: 11 }}>
                      {format(d, compact ? 'EEEEE' : 'EEE')}
                    </Text>
                    <View
                      style={{
                        minWidth: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isToday ? palette.accents.coral.base : 'transparent',
                      }}>
                      <Text variant="bodyStrong" color={isToday ? palette.accents.coral.on : palette.text}>
                        {format(d, 'd')}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                {allDay[col].slice(0, 2).map((o) => {
                  const tone = palette.accents[colour(o.event.calendarId)];
                  return (
                    <Pressable
                      key={o.key}
                      onPress={() => openOccurrence(o)}
                      accessibilityRole="button"
                      accessibilityLabel={`${o.event.title}, all day`}
                      style={{ backgroundColor: tone.soft, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 }}>
                      <Text
                        numberOfLines={1}
                        style={{ fontFamily: fonts.bodyBold, fontSize: compact ? 9 : 11, lineHeight: compact ? 12 : 15, color: tone.ink }}>
                        {o.event.title}
                      </Text>
                    </Pressable>
                  );
                })}
                {allDay[col].length > 2 ? (
                  <Text variant="caption" tone="tertiary" style={{ fontSize: 10, textAlign: 'center' }}>
                    +{allDay[col].length - 2}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
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
                        onPress={() => openOccurrence(p.occurrence)}
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
                          numberOfLines={Math.max(1, Math.floor((h - 6) / (compact ? 12 : multi ? 15 : 17)))}
                          style={{
                            fontFamily: fonts.bodyBold,
                            fontSize: compact ? 10 : multi ? 12 : 13,
                            lineHeight: compact ? 12 : multi ? 15 : 17,
                            color: tone.ink,
                          }}>
                          {p.occurrence.event.title}
                        </Text>
                        {!compact && h > (multi ? 44 : 36) ? (
                          <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: tone.ink }}>
                            {formatTime(timeKeyOf(p.occurrence.start))}
                            {p.occurrence.event.location && !multi ? ` · ${p.occurrence.event.location}` : ''}
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

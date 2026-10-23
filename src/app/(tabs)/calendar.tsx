import { Icon } from '@/components/ui/Icon';
import { addMonths } from 'date-fns/addMonths';
import { addWeeks } from 'date-fns/addWeeks';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/calendar/EventCard';
import { MonthGrid, WeekStrip } from '@/components/calendar/MonthGrid';
import { TimeGrid } from '@/components/calendar/TimeGrid';
import { Card, Chip, EmptyState, IconButton, Segmented, Text, useTabBarClearance } from '@/components/ui';
import { expandOccurrences } from '@/features/calendar/recurrence';
import { useCalendar, visibleEvents } from '@/features/calendar/store';
import type { EventOccurrence } from '@/features/types';
import { useNow } from '@/hooks/useNow';
import { addDays, format, fromDateKey, monthGrid, relativeDayLabel, toDateKey, weekDays, type DateKey } from '@/lib/dates';
import { layout, space, useTheme, type AccentKey } from '@/theme';

type View_ = 'day' | 'week' | 'month' | 'agenda';

export default function CalendarScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ date?: string }>();
  const now = useNow();
  const today = toDateKey(now);
  const [view, setView] = useState<View_>('month');
  const [selected, setSelected] = useState<DateKey>(params.date ?? today);
  const events = useCalendar((s) => s.events);
  const calendars = useCalendar((s) => s.calendars);
  const toggleCalendar = useCalendar((s) => s.toggleCalendar);

  // Jump to a date when navigated here with one (e.g. from a Home suggestion).
  const [seenParam, setSeenParam] = useState(params.date);
  if (params.date !== seenParam) {
    setSeenParam(params.date);
    if (params.date) {
      setSelected(params.date);
      setView('day');
    }
  }

  const anchor = fromDateKey(selected);
  const range = useMemo(() => {
    if (view === 'month') {
      const grid = monthGrid(anchor);
      return [toDateKey(grid[0]), toDateKey(grid[41])] as const;
    }
    if (view === 'agenda') return [selected, toDateKey(addDays(anchor, 30))] as const;
    const week = weekDays(anchor);
    return [toDateKey(week[0]), toDateKey(week[6])] as const;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selected]);

  const { byDay, dots } = useMemo(() => {
    const occ = expandOccurrences(visibleEvents(events, calendars), range[0], range[1]);
    const colour = new Map(calendars.map((c) => [c.id, c.color]));
    const byDay: Record<DateKey, EventOccurrence[]> = {};
    const dots: Record<DateKey, AccentKey[]> = {};
    for (const o of occ) {
      // Multi-day events appear on every day they touch.
      let d = o.date;
      const last = o.end.slice(0, 10);
      while (d <= last && d <= range[1]) {
        (byDay[d] ??= []).push(o);
        (dots[d] ??= []).push(colour.get(o.event.calendarId) ?? 'sky');
        d = toDateKey(addDays(fromDateKey(d), 1));
      }
    }
    return { byDay, dots };
  }, [events, calendars, range]);

  const step = (dir: 1 | -1) => {
    const next =
      view === 'month'
        ? addMonths(anchor, dir)
        : view === 'week'
          ? addWeeks(anchor, dir)
          : view === 'day'
            ? addDays(anchor, dir)
            : addDays(anchor, dir * 30);
    setSelected(toDateKey(next));
  };

  const title = view === 'day' ? format(anchor, 'EEEE d MMMM') : format(anchor, 'MMMM yyyy');
  const selectedDay = byDay[selected] ?? [];
  const nowTime = format(now, 'HH:mm');
  const gridHeight = Math.max(360, height - insets.top - clearance - 250);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        style={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: layout.screenPadding,
          gap: space.lg,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Text variant="overline" tone="sky">
              Calendar
            </Text>
            <Text variant="title" accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
          </View>
          {selected !== today ? (
            <Pressable
              onPress={() => setSelected(today)}
              accessibilityRole="button"
              hitSlop={8}
              style={{
                paddingHorizontal: 12,
                height: 34,
                borderRadius: 17,
                backgroundColor: palette.accents.coral.soft,
                justifyContent: 'center',
              }}>
              <Text variant="callout" tone="coral">
                Today
              </Text>
            </Pressable>
          ) : null}
          <IconButton icon="chevron-back" label="Previous" size={36} onPress={() => step(-1)} />
          <IconButton icon="chevron-forward" label="Next" size={36} onPress={() => step(1)} />
        </View>
        <Segmented
          value={view}
          onChange={setView}
          accent="sky"
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'agenda', label: 'Agenda' },
          ]}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
          style={{ marginHorizontal: -layout.screenPadding }}
          contentInset={{ left: 0 }}>
          <View style={{ width: layout.screenPadding - space.sm }} />
          {calendars.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              small
              dot={c.color}
              accent={c.color}
              selected={c.visible}
              onPress={() => toggleCalendar(c.id)}
            />
          ))}
          <View style={{ width: layout.screenPadding - space.sm }} />
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={view === 'month' || view === 'agenda'}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: space.lg,
          paddingBottom: clearance,
          gap: space.lg,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}>
        {view === 'month' ? (
          <View style={{ gap: space.lg }}>
            <Card>
              <MonthGrid anchor={anchor} selected={selected} today={today} onSelect={setSelected} dots={dots} />
            </Card>
            <DayList date={selected} items={selectedDay} nowTime={selected === today ? nowTime : undefined} />
          </View>
        ) : null}

        {view === 'week' || view === 'day' ? (
          <View style={{ gap: space.md }}>
            <WeekStrip anchor={anchor} selected={selected} today={today} onSelect={(d) => setSelected(d)} dots={dots} />
            <AllDayRow items={(view === 'day' ? selectedDay : []).filter((o) => o.event.allDay)} />
            <TimeGrid
              days={view === 'day' ? [selected] : weekDays(anchor).map(toDateKey)}
              occurrences={byDay}
              today={today}
              nowTime={nowTime}
              height={gridHeight}
            />
          </View>
        ) : null}

        {view === 'agenda' ? (
          <View style={{ gap: space.xl }}>
            {Object.keys(byDay).filter((d) => d >= selected).length === 0 ? (
              <Card>
                <EmptyState
                  illustration="calendar"
                  title="Nothing coming up"
                  body="Your next 30 days are wide open."
                  action="Add event"
                  onAction={() => router.push({ pathname: '/event/[id]', params: { id: 'new', date: selected } })}
                />
              </Card>
            ) : (
              Object.keys(byDay)
                .filter((d) => d >= selected)
                .sort()
                .map((d) => <DayList key={d} date={d} items={byDay[d]} nowTime={d === today ? nowTime : undefined} />)
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DayList({ date, items, nowTime }: { date: DateKey; items: EventOccurrence[]; nowTime?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="subheading">
          {relativeDayLabel(date)}
          <Text variant="callout" tone="secondary">
            {'  '}
            {format(fromDateKey(date), 'd MMM')}
          </Text>
        </Text>
        <Pressable
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: 'new', date } })}
          accessibilityRole="button"
          accessibilityLabel={`Add event on ${format(fromDateKey(date), 'EEEE d MMMM')}`}
          hitSlop={10}>
          <Icon name="add-circle" size={26} color={palette.accents.sky.base} />
        </Pressable>
      </View>
      {items.length ? (
        items.map((o) => <EventCard key={o.key} occurrence={o} now={nowTime} />)
      ) : (
        <View style={{ paddingVertical: space.lg, alignItems: 'center', backgroundColor: palette.surface, borderRadius: 20 }}>
          <Text variant="callout" tone="secondary">
            Nothing planned — a free day.
          </Text>
        </View>
      )}
    </View>
  );
}

function AllDayRow({ items }: { items: EventOccurrence[] }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      {items.map((o) => (
        <EventCard key={o.key} occurrence={o} compact />
      ))}
    </View>
  );
}

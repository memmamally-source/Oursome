import { Icon } from '@/components/ui/Icon';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/calendar/EventCard';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { TimeGrid } from '@/components/calendar/TimeGrid';
import { Avatar, Card, Chip, EmptyState, IconButton, Segmented, Text, useTabBarClearance } from '@/components/ui';
import { useCalendarFocus } from '@/features/calendar/focus';
import { expandOccurrences } from '@/features/calendar/recurrence';
import { useCalendar, visibleEvents } from '@/features/calendar/store';
import { taskOccurrences } from '@/features/calendar/tasks';
import { columnsFor, onlyPerson, rangeFor, stepFor, type CalendarView } from '@/features/calendar/views';
import { eventAccents } from '@/features/people/logic';
import { useSettings } from '@/features/settings/store';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { EventOccurrence, Member } from '@/features/types';
import { useLayout } from '@/hooks/useLayout';
import { useNow } from '@/hooks/useNow';
import { useSwipe } from '@/hooks/useSwipe';
import { addDays, format, fromDateKey, relativeDayLabel, toDateKey, type DateKey } from '@/lib/dates';
import { fonts, layout, paperProps, radius, space, useTheme, type AccentKey } from '@/theme';

export default function CalendarScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const { isWide } = useLayout();
  const params = useLocalSearchParams<{ date?: string; person?: string }>();
  const now = useNow();
  const today = toDateKey(now);
  const [view, setView] = useState<CalendarView>('days');
  const [selected, setSelected] = useState<DateKey>(params.date ?? today);
  const [person, setPerson] = useState<string | null>(params.person ?? null);
  const [showCalendars, setShowCalendars] = useState(false);
  const events = useCalendar((s) => s.events);
  const calendars = useCalendar((s) => s.calendars);
  const toggleCalendar = useCalendar((s) => s.toggleCalendar);
  const tasks = useTasks((s) => s.tasks);
  const tasksOn = useSettings((s) => s.tasksOnCalendar);
  const setTasksOn = useSettings((s) => s.setTasksOnCalendar);
  const members = useSpace((s) => s.people);

  // Jump to a date when navigated here with one (e.g. from a Home suggestion).
  const [seenParam, setSeenParam] = useState(params.date);
  if (params.date !== seenParam) {
    setSeenParam(params.date);
    if (params.date) {
      setSelected(params.date);
      setView('day');
    }
  }

  // …or to one person's calendar (from Our Space or a person's page).
  const [seenPerson, setSeenPerson] = useState(params.person);
  if (params.person !== seenPerson) {
    setSeenPerson(params.person);
    setPerson(params.person ?? null);
  }

  // The big + button adds on the day picked here (see TabBar).
  const setFocus = useCalendarFocus((s) => s.setDate);
  useFocusEffect(
    useCallback(() => {
      setFocus(selected);
    }, [selected, setFocus]),
  );

  // Swipe left or right to move by a day, three days, a week or a month.
  const swipe = useSwipe(
    () => setSelected(stepFor(view, selected, 1, isWide)),
    () => setSelected(stepFor(view, selected, -1, isWide)),
  );

  const range = rangeFor(view, selected, isWide);
  const { byDay, dots, labels } = useMemo(() => {
    const shown = [...expandOccurrences(visibleEvents(events, calendars), range[0], range[1]), ...(tasksOn ? taskOccurrences(tasks, range[0], range[1]) : [])];
    const occ = onlyPerson(shown, person, calendars).sort((a, b) => a.start.localeCompare(b.start));
    const byDay: Record<DateKey, EventOccurrence[]> = {};
    const dots: Record<DateKey, AccentKey[]> = {};
    const labels: Record<DateKey, { title: string; accent: AccentKey }[]> = {};
    for (const o of occ) {
      // In the colour of each person it's for (or its calendar's).
      const accents = eventAccents(o.event, calendars, members);
      // Multi-day events appear on every day they touch.
      let d = o.date;
      const last = o.end.slice(0, 10);
      while (d <= last && d <= range[1]) {
        (byDay[d] ??= []).push(o);
        (dots[d] ??= []).push(...accents);
        (labels[d] ??= []).push({ title: o.event.title, accent: accents[0] });
        d = toDateKey(addDays(fromDateKey(d), 1));
      }
    }
    return { byDay, dots, labels };
  }, [events, calendars, members, tasks, tasksOn, range[0], range[1], person]); // eslint-disable-line react-hooks/exhaustive-deps

  const anchor = fromDateKey(selected);
  const columns = columnsFor(view, selected, isWide);
  const title =
    view === 'day'
      ? format(anchor, 'EEEE d MMMM')
      : view === 'days'
        ? rangeTitle(columns[0], columns[columns.length - 1])
        : format(anchor, 'MMMM yyyy');
  const selectedDay = byDay[selected] ?? [];
  const nowTime = format(now, 'HH:mm');
  const hidden = calendars.filter((c) => !c.visible).length + (tasksOn ? 0 : 1);
  const showsToday = view === 'days' ? columns.includes(today) : selected === today;

  return (
    <View {...paperProps} style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        style={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: layout.screenPadding,
          gap: space.md,
          width: '100%',
          maxWidth: isWide ? layout.maxWideContentWidth : layout.maxContentWidth,
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
          {!showsToday ? (
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
              <Text variant="callout" tone="coral" style={{ fontFamily: fonts.bodyBold }}>
                Today
              </Text>
            </Pressable>
          ) : null}
          <IconButton icon="chevron-back" label="Previous" size={36} onPress={() => setSelected(stepFor(view, selected, -1, isWide))} />
          <IconButton icon="chevron-forward" label="Next" size={36} onPress={() => setSelected(stepFor(view, selected, 1, isWide))} />
        </View>

        <Segmented
          value={view}
          onChange={setView}
          accent="sky"
          options={[
            { value: 'day', label: 'Day' },
            { value: 'days', label: isWide ? 'Week' : '3 days' },
            { value: 'month', label: 'Month' },
            { value: 'list', label: 'List' },
          ]}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}>
            {members.length > 1 ? (
              <>
                <Chip small label="Everyone" accent="sky" selected={!person} onPress={() => setPerson(null)} />
                {members.map((m) => (
                  <PersonChip key={m.id} member={m} selected={person === m.id} onPress={() => setPerson(person === m.id ? null : m.id)} />
                ))}
              </>
            ) : null}
          </ScrollView>
          <Pressable
            onPress={() => setShowCalendars(!showCalendars)}
            accessibilityRole="button"
            aria-expanded={showCalendars}
            accessibilityLabel="Choose calendars"
            hitSlop={6}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              height: 32,
              paddingHorizontal: 10,
              borderRadius: radius.pill,
              backgroundColor: showCalendars ? palette.accents.sky.soft : palette.surfaceSunken,
            }}>
            <Icon name="options-outline" size={15} color={palette.textSecondary} />
            {hidden || isWide || members.length <= 1 ? (
              <Text variant="caption" tone="secondary" style={{ fontFamily: fonts.bodyBold }}>
                {hidden ? `${calendars.length + 1 - hidden}/${calendars.length + 1}` : 'Calendars'}
              </Text>
            ) : null}
          </Pressable>
        </View>
        {showCalendars ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
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
            <Chip label="Tasks" small dot="mint" accent="mint" selected={tasksOn} onPress={() => setTasksOn(!tasksOn)} />
            <Chip label="Import or export" small icon="swap-vertical-outline" accent="sky" onPress={() => router.push('/calendar-files')} />
          </View>
        ) : null}
      </View>

      {view === 'day' || view === 'days' ? (
        <View
          {...swipe}
          style={{
            flex: 1,
            paddingHorizontal: layout.screenPadding,
            paddingTop: space.md,
            paddingBottom: isWide ? space.xl : clearance - space.xxl,
            width: '100%',
            maxWidth: isWide ? layout.maxWideContentWidth : layout.maxContentWidth,
            alignSelf: 'center',
          }}>
          <TimeGrid
            days={columns}
            occurrences={byDay}
            today={today}
            nowTime={nowTime}
            onSelectDay={(d) => {
              setSelected(d);
              setView('day');
            }}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: space.md,
            paddingBottom: clearance,
            gap: space.lg,
            width: '100%',
            maxWidth: isWide ? layout.maxWideContentWidth : layout.maxContentWidth,
            alignSelf: 'center',
          }}>
          {view === 'month' ? (
            <View style={isWide ? { flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' } : { gap: space.lg }}>
              <View {...swipe} style={isWide ? { flex: 3 } : undefined}>
                <Card>
                  <MonthGrid anchor={anchor} selected={selected} today={today} onSelect={setSelected} dots={dots} labels={labels} />
                </Card>
              </View>
              <View style={isWide ? { flex: 2 } : undefined}>
                <DayList date={selected} items={selectedDay} nowTime={selected === today ? nowTime : undefined} />
              </View>
            </View>
          ) : null}

          {view === 'list' ? (
            <View style={{ gap: space.xl }}>
              {Object.keys(byDay).filter((d) => d >= selected).length === 0 ? (
                <Card>
                  <EmptyState
                    illustration="calendar"
                    title="Nothing coming up"
                    body={person ? 'Nothing for this person in the next 30 days.' : 'Your next 30 days are wide open.'}
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
      )}
    </View>
  );
}

function rangeTitle(a: DateKey, b: DateKey): string {
  const x = fromDateKey(a);
  const y = fromDateKey(b);
  if (a.slice(0, 7) === b.slice(0, 7)) return `${format(x, 'd')} – ${format(y, 'd MMM')}`;
  return `${format(x, 'd MMM')} – ${format(y, 'd MMM')}`;
}

function PersonChip({ member, selected, onPress }: { member: Member; selected: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  const tone = palette.accents[member.color];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      aria-selected={selected}
      accessibilityLabel={`Show ${member.isMe ? 'my' : `${member.name}’s`} events`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 32,
        paddingLeft: 3,
        paddingRight: 12,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? tone.base : palette.border,
        backgroundColor: selected ? tone.soft : palette.surface,
      }}>
      <Avatar name={member.name} accent={member.color} size={24} />
      <Text variant="caption" color={selected ? tone.ink : palette.text} style={{ fontFamily: fonts.bodyBold }}>
        {member.isMe ? 'Me' : member.name.split(' ')[0]}
      </Text>
    </Pressable>
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

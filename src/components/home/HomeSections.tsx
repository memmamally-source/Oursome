import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useCalendarAccent } from '@/components/calendar/EventCard';
import { TaskRow } from '@/components/tasks/TaskRow';
import type { Suggestion } from '@/features/dashboard/suggestions';
import type { EventOccurrence, Member, ShoppingList, Task } from '@/features/types';
import { formatTime, relativeDayLabel, timeKeyOf } from '@/lib/dates';
import { fonts, radius, space, useTheme } from '@/theme';

import { Avatar } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

export function SectionTitle({ title, detail, action, onAction }: { title: string; detail?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.md, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexShrink: 1 }}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {detail ? (
          <Text variant="callout" tone="tertiary" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text variant="callout" tone="coral" style={{ fontFamily: fonts.bodyBold }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AgendaRow({ o, nowTime, person }: { o: EventOccurrence; nowTime: string; person?: Member }) {
  const { palette } = useTheme();
  const accent = useCalendarAccent(o.event.calendarId);
  const start = timeKeyOf(o.start);
  const end = timeKeyOf(o.end);
  const past = !o.event.allDay && end <= nowTime;
  const now = !o.event.allDay && start <= nowTime && end > nowTime;
  const [hm, ampm] = o.event.allDay ? ['All', 'day'] : formatTime(start).split(' ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: o.event.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${o.event.title}, ${o.event.allDay ? 'all day' : formatTime(start)}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: past ? 0.5 : pressed ? 0.7 : 1 })}>
      <View style={{ width: 46, alignItems: 'flex-end' }}>
        <Text variant="bodyStrong" style={{ lineHeight: 20 }}>
          {hm}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ fontSize: 11, lineHeight: 13 }}>
          {ampm}
        </Text>
      </View>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: palette.accents[accent].base }} />
      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {o.event.title}
          </Text>
          {now ? (
            <View style={{ backgroundColor: palette.accents.coral.base, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 }}>
              <Text variant="caption" color={palette.accents.coral.on} style={{ fontFamily: fonts.bodyBold, fontSize: 11 }}>
                Now
              </Text>
            </View>
          ) : null}
        </View>
        {o.event.location || !o.event.allDay ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {[!o.event.allDay ? `until ${formatTime(end)}` : null, o.event.location].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      {person ? <Avatar name={person.name} accent={person.color} size={26} /> : null}
    </Pressable>
  );
}

/** Today in one list: what's on, then what's to do. */
export function TodayCard({
  events,
  tasks,
  nowTime,
  people,
  memberForCalendar,
}: {
  events: EventOccurrence[];
  tasks: Task[];
  nowTime: string;
  people: Member[];
  memberForCalendar: (calendarId: string) => string | undefined;
}) {
  const { palette } = useTheme();
  const shown = tasks.slice(0, 6);
  const personOf = (o: EventOccurrence) => {
    const id = o.event.personId ?? memberForCalendar(o.event.calendarId);
    return people.find((p) => p.id === id && !p.isMe);
  };
  return (
    <View style={{ backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
      {events.length === 0 && tasks.length === 0 ? (
        <View style={{ paddingVertical: space.xl, alignItems: 'center', gap: space.xs }}>
          <Icon name="sunny-outline" size={28} color={palette.accents.sunshine.base} />
          <Text variant="bodyStrong">Nothing planned today</Text>
          <Text variant="callout" tone="secondary" align="center">
            Enjoy the space — or tell your organiser what’s coming up.
          </Text>
        </View>
      ) : null}
      {events.map((o, i) => (
        <View key={o.key} style={i ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
          <AgendaRow o={o} nowTime={nowTime} person={personOf(o)} />
        </View>
      ))}
      {shown.length ? (
        <View style={events.length ? { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.sm } : undefined}>
          <Text variant="overline" tone="tertiary" style={{ marginTop: space.xs }}>
            To do
          </Text>
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
          {tasks.length > shown.length ? (
            <Pressable onPress={() => router.navigate('/tasks')} accessibilityRole="button" style={{ paddingVertical: space.sm }}>
              <Text variant="callout" tone="coral" style={{ fontFamily: fonts.bodyBold }}>
                {tasks.length - shown.length} more to do →
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** A slim, dismissible nudge — never more than one at a time. */
export function SuggestionLine({ suggestion, onAction, onDismiss }: { suggestion: Suggestion; onAction: () => void; onDismiss: () => void }) {
  const { palette } = useTheme();
  const tone = palette.accents[suggestion.accent];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: tone.soft, borderRadius: radius.lg, padding: space.md }}>
      <Icon name={suggestion.icon} size={20} color={tone.ink} />
      <View style={{ flex: 1, gap: space.xs }}>
        <Text variant="callout">{suggestion.text}</Text>
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Text variant="callout" color={tone.ink} style={{ fontFamily: fonts.bodyBold }}>
            {suggestion.actionLabel} →
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10}>
        <Icon name="close" size={16} color={palette.textSecondary} />
      </Pressable>
    </View>
  );
}

/** The people you plan with, each with what's on their plate today. */
export function PeopleRow({ people, counts }: { people: Member[]; counts: Record<string, number> }) {
  const { palette } = useTheme();
  if (people.length <= 1) {
    return (
      <PressableScale
        onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new' } })}
        accessibilityLabel="Add a person"
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: palette.accents.sunshine.soft, borderRadius: radius.xl, padding: space.lg }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: palette.accents.sunshine.base, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="person-add" size={22} color={palette.accents.sunshine.on} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Add the people you plan with</Text>
          <Text variant="callout" tone="secondary">
            A partner, children, housemates. Then you can give them tasks and see their plans.
          </Text>
        </View>
      </PressableScale>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg, paddingRight: space.lg, paddingTop: 4 }}>
      {people.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${p.isMe ? 'You' : p.name}, ${counts[p.id] ?? 0} things today`}
          style={({ pressed }) => ({ alignItems: 'center', gap: 6, width: 68, opacity: pressed ? 0.7 : 1 })}>
          <View>
            <Avatar name={p.name} accent={p.color} size={56} />
            {counts[p.id] ? (
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  top: -2,
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  paddingHorizontal: 5,
                  backgroundColor: palette.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: palette.background,
                }}>
                <Text variant="caption" color={palette.background} style={{ fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14 }}>
                  {counts[p.id]}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="caption" numberOfLines={1} style={{ fontFamily: fonts.bodyMedium }}>
            {p.isMe ? 'You' : p.name.split(' ')[0]}
          </Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new' } })}
        accessibilityRole="button"
        accessibilityLabel="Add a person"
        style={({ pressed }) => ({ alignItems: 'center', gap: 6, width: 68, opacity: pressed ? 0.7 : 1 })}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: palette.textTertiary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="add" size={24} color={palette.textSecondary} />
        </View>
        <Text variant="caption" tone="secondary">
          Add
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export function ListsRow({ lists }: { lists: { list: ShoppingList; remaining: number }[] }) {
  const { palette } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
      {lists.map(({ list, remaining }) => {
        const tone = palette.accents[list.color];
        return (
          <Pressable
            key={list.id}
            onPress={() => router.push({ pathname: '/shopping/[id]', params: { id: list.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${list.name}, ${remaining} to get`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.pill,
              paddingLeft: 6,
              paddingRight: space.lg,
              height: 48,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={list.icon} size={18} color={tone.ink} />
            </View>
            <Text variant="bodyStrong">{list.name}</Text>
            <Text variant="callout" tone="secondary">
              {remaining}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ComingUp({ dates }: { dates: EventOccurrence[] }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: space.md }}>
      {dates.slice(0, 3).map((o) => (
        <Pressable
          key={o.key}
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: o.event.id } })}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Icon name={/birthday/i.test(o.event.title) ? 'gift-outline' : 'star-outline'} size={18} color={palette.accents.sunshine.ink} />
          <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
            {o.event.title}
          </Text>
          <Text variant="callout" tone="secondary">
            {relativeDayLabel(o.date)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

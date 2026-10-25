import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useCalendarAccent } from '@/components/calendar/EventCard';
import { TaskRow } from '@/components/tasks/TaskRow';
import type { Activity } from '@/features/activity/store';
import type { Suggestion } from '@/features/dashboard/suggestions';
import type { EventOccurrence, IconName, Member, ShoppingList, Task } from '@/features/types';
import { formatTime, relativeDayLabel, timeKeyOf } from '@/lib/dates';
import { fonts, radius, space, useTheme, type AccentKey } from '@/theme';

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

/** Birthdays, anniversaries and reminders coming up, soonest first. */
export function ComingUp({ dates, reminders }: { dates: EventOccurrence[]; reminders: Task[] }) {
  const { palette } = useTheme();
  const rows = [
    ...dates.map((o) => ({
      key: o.key,
      date: o.date,
      title: o.event.title,
      icon: (/birthday/i.test(o.event.title) ? 'gift-outline' : /anniversary/i.test(o.event.title) ? 'heart-outline' : 'star-outline') as IconName,
      accent: 'sunshine' as AccentKey,
      open: () => router.push({ pathname: '/event/[id]', params: { id: o.event.id } }),
    })),
    ...reminders.map((t) => ({
      key: t.id,
      date: t.due!,
      title: t.title,
      icon: 'notifications-outline' as IconName,
      accent: 'lavender' as AccentKey,
      open: () => router.push({ pathname: '/task/[id]', params: { id: t.id } }),
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  return (
    <View style={{ backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, paddingHorizontal: space.lg }}>
      {rows.map((r, i) => (
        <Pressable
          key={r.key}
          onPress={r.open}
          accessibilityRole="button"
          accessibilityLabel={`${r.title}, ${relativeDayLabel(r.date)}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingVertical: space.md,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: palette.border,
            opacity: pressed ? 0.7 : 1,
          })}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: palette.accents[r.accent].soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={r.icon} size={16} color={palette.accents[r.accent].ink} />
          </View>
          <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
            {r.title}
          </Text>
          <Text variant="callout" tone="secondary">
            {relativeDayLabel(r.date)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** One-tap ways to add the common things. */
export function QuickActions() {
  const { palette } = useTheme();
  const actions: { label: string; icon: IconName; accent: AccentKey; go: () => void }[] = [
    { label: 'Task', icon: 'checkmark-circle-outline', accent: 'mint', go: () => router.push({ pathname: '/task/[id]', params: { id: 'new' } }) },
    { label: 'Event', icon: 'calendar-outline', accent: 'sky', go: () => router.push({ pathname: '/event/[id]', params: { id: 'new' } }) },
    { label: 'List item', icon: 'basket-outline', accent: 'sunshine', go: () => router.navigate({ pathname: '/tasks', params: { view: 'lists' } }) },
    { label: 'Memory', icon: 'book-outline', accent: 'coral', go: () => router.push({ pathname: '/memory/[id]', params: { id: 'new' } }) },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {actions.map((a) => {
        const tone = palette.accents[a.accent];
        return (
          <PressableScale
            key={a.label}
            onPress={a.go}
            accessibilityLabel={`New ${a.label.toLowerCase()}`}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 6,
              paddingVertical: space.md,
              borderRadius: radius.lg,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
            }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a.icon} size={18} color={tone.ink} />
            </View>
            <Text variant="caption" style={{ fontFamily: fonts.bodyBold }} numberOfLines={1}>
              {a.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** The first list with things to get, as a quick glance. */
export function ShoppingPreview({ lists }: { lists: { list: ShoppingList; remaining: number; preview: string[] }[] }) {
  const { palette } = useTheme();
  const first = lists.find((l) => l.remaining > 0) ?? lists[0];
  if (!first) return null;
  const tone = palette.accents[first.list.color];
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/shopping/[id]', params: { id: first.list.id } })}
      accessibilityLabel={`${first.list.name}: ${first.remaining} to get`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, padding: space.lg }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={first.list.icon} size={22} color={tone.ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">
          {first.list.name} · {first.remaining ? `${first.remaining} to get` : 'all done'}
        </Text>
        <Text variant="callout" tone="secondary" numberOfLines={1}>
          {first.preview.length ? first.preview.join(', ') : 'Nothing needed right now.'}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={palette.textTertiary} />
    </PressableScale>
  );
}

/** What's been happening at home lately. */
export function RecentActivity({ items, people }: { items: Activity[]; people: Member[] }) {
  const { palette } = useTheme();
  const icon: Record<Activity['kind'], IconName> = {
    task: 'add-circle-outline',
    done: 'checkmark-circle-outline',
    event: 'calendar-outline',
    shopping: 'basket-outline',
    person: 'person-add-outline',
    memory: 'book-outline',
  };
  return (
    <View style={{ gap: space.sm }}>
      {items.slice(0, 4).map((a) => {
        const who = people.find((p) => p.id === a.actorId);
        const name = !who || who.isMe ? 'You' : who.name.split(' ')[0];
        return (
          <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name={icon[a.kind]} size={16} color={palette.textSecondary} />
            <Text variant="callout" style={{ flex: 1 }} numberOfLines={1}>
              <Text variant="callout" style={{ fontFamily: fonts.bodyBold }}>
                {name}
              </Text>{' '}
              {a.text}
            </Text>
            <Text variant="caption" tone="tertiary">
              {timeAgo(a.at)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

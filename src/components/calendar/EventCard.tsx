import { Icon } from '@/components/ui/Icon';
import { router } from 'expo-router';
import { View } from 'react-native';

import { useCalendar } from '@/features/calendar/store';
import { eventAccents } from '@/features/people/logic';
import { useSpace } from '@/features/space/store';
import type { CalendarEvent, EventOccurrence } from '@/features/types';
import { formatTime, timeKeyOf } from '@/lib/dates';
import { fonts, radius, space, useTheme, type AccentKey } from '@/theme';

import { AvatarStack } from '../ui/primitives';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

/** An entry's colour: the person it's for, else its calendar's (see eventAccents). */
export function useEventAccent(event: CalendarEvent): AccentKey {
  const calendars = useCalendar((s) => s.calendars);
  const people = useSpace((s) => s.people);
  return eventAccents(event, calendars, people)[0];
}

/** Open what a calendar entry stands for: the task for a dated task, otherwise the event. */
export function openOccurrence(o: EventOccurrence) {
  if (o.event.taskId) router.push({ pathname: '/task/[id]', params: { id: o.event.taskId } });
  else router.push({ pathname: '/event/[id]', params: { id: o.event.id } });
}

/** Colour-coded event card used on Home, Day and Agenda views. */
export function EventCard({ occurrence, compact, now }: { occurrence: EventOccurrence; compact?: boolean; now?: string }) {
  const { palette } = useTheme();
  const accent = useEventAccent(occurrence.event);
  const tone = palette.accents[accent];
  const { event } = occurrence;
  const start = timeKeyOf(occurrence.start);
  const end = timeKeyOf(occurrence.end);
  const isNow = !!now && !event.allDay && start <= now && end > now;
  const isPast = !!now && !event.allDay && end <= now;
  const people = useSpace((s) => s.people);
  const going = event.participantIds?.length ? people.filter((p) => event.participantIds!.includes(p.id)) : [];

  return (
    <PressableScale
      onPress={() => openOccurrence(occurrence)}
      accessibilityLabel={`${event.taskId ? 'Task: ' : ''}${event.title}, ${event.allDay ? 'all day' : `${formatTime(start)} to ${formatTime(end)}`}${event.location ? `, at ${event.location}` : ''}${going.length ? `, with ${going.map((p) => p.name).join(', ')}` : ''}`}
      style={{
        flexDirection: 'row',
        backgroundColor: tone.soft,
        borderRadius: radius.lg,
        padding: compact ? space.md : space.lg,
        gap: space.md,
        opacity: isPast ? 0.6 : 1,
        borderWidth: isNow ? 2 : 0,
        borderColor: tone.base,
      }}>
      <View style={{ width: 5, borderRadius: 3, backgroundColor: tone.base }} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {event.taskId ? <Icon name="checkmark-circle-outline" size={14} color={tone.ink} /> : null}
          <Text variant="caption" color={tone.ink} style={{ fontFamily: fonts.bodyBold }}>
            {event.taskId
              ? event.allDay
                ? 'Task'
                : `Task · ${formatTime(start)}`
              : event.allDay
                ? 'All day'
                : `${formatTime(start)} – ${formatTime(end)}`}
          </Text>
          {isNow ? (
            <View style={{ backgroundColor: tone.base, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text variant="caption" color={tone.on} style={{ fontFamily: fonts.bodyBold, fontSize: 11 }}>
                NOW
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="bodyStrong" numberOfLines={1}>
          {event.title}
        </Text>
        {!compact && (event.location || event.visibility === 'shared' || event.recurrence) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 2, flexWrap: 'wrap' }}>
            {event.location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 }}>
                <Icon name="location-outline" size={13} color={palette.textSecondary} />
                <Text variant="caption" tone="secondary" numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            ) : null}
            {event.visibility === 'shared' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="people-outline" size={13} color={palette.textSecondary} />
                <Text variant="caption" tone="secondary">
                  Shared
                </Text>
              </View>
            ) : null}
            {event.recurrence ? <Icon name="repeat" size={13} color={palette.textSecondary} accessibilityLabel="Repeats" /> : null}
          </View>
        ) : null}
      </View>
      {going.length ? (
        <View style={{ justifyContent: 'center' }}>
          <AvatarStack people={going} size={compact ? 22 : 26} />
        </View>
      ) : null}
    </PressableScale>
  );
}

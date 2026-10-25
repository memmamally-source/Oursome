import { confirmAction } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { ChipRow, DatePicker, Field, RepeatPicker, ReminderPicker, TimePicker } from '@/components/forms/Fields';
import { Button, Chip, ModalHeader, ModalScreen, Segmented, SettingRow, Text } from '@/components/ui';
import { PERSONAL_CALENDAR_ID, useCalendar } from '@/features/calendar/store';
import { useSpace } from '@/features/space/store';
import { haptic } from '@/lib/haptics';
import { combine, dateKeyOf, deviceTimeZone, formatTime, minutesOfDay, timeFromMinutes, timeKeyOf, todayKey } from '@/lib/dates';
import { fonts, radius, space, useTheme } from '@/theme';

const durations = [15, 30, 45, 60, 90, 120, 180];
const durationLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${m / 60} hrs` : `${m / 60} hr${m > 60 ? 's' : ''}`);

export default function EventEditor() {
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    date?: string;
    time?: string;
    endTime?: string;
    location?: string;
    allDay?: string;
    /** '1' starts a yearly, all-day important date (birthday, anniversary). */
    important?: string;
  }>();
  const { palette } = useTheme();
  const existing = useCalendar((s) => s.events.find((e) => e.id === params.id));
  const calendars = useCalendar((s) => s.calendars);
  const { addEvent, updateEvent, removeEvent } = useCalendar.getState();
  const hasSpace = useSpace((s) => !!s.space);

  const initialStart = existing ? timeKeyOf(existing.start) : params.time || '09:00';
  const initialEnd = existing ? timeKeyOf(existing.end) : params.endTime || timeFromMinutes(minutesOfDay(initialStart) + 60);

  const [title, setTitle] = useState(existing?.title ?? params.title ?? '');
  const [allDay, setAllDay] = useState(existing?.allDay ?? (!!params.allDay || !!params.important));
  const [date, setDate] = useState(existing ? dateKeyOf(existing.start) : params.date || todayKey());
  const [start, setStart] = useState(initialStart);
  const [duration, setDuration] = useState(Math.max(15, minutesOfDay(initialEnd) - minutesOfDay(initialStart)));
  const [calendarId, setCalendarId] = useState(existing?.calendarId ?? PERSONAL_CALENDAR_ID);
  const [location, setLocation] = useState(existing?.location ?? params.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [recurrence, setRecurrence] = useState(existing?.recurrence ?? (params.important ? { freq: 'yearly' as const } : null));
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(existing?.reminderMinutes ?? 30);
  const [visibility, setVisibility] = useState(existing?.visibility ?? 'private');
  const [important, setImportant] = useState(existing ? !!existing.isImportantDate : !!params.important);

  const endMinutes = Math.min(minutesOfDay(start) + duration, 23 * 60 + 59);
  const end = timeFromMinutes(endMinutes);
  const calendar = calendars.find((c) => c.id === calendarId);
  const accent = calendar?.color ?? 'sky';
  const timeZone = existing?.timeZone ?? deviceTimeZone();

  const save = () => {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      start: combine(date, allDay ? '00:00' : start),
      end: combine(date, allDay ? '23:59' : end),
      allDay,
      timeZone,
      calendarId,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      recurrence,
      reminderMinutes,
      visibility: hasSpace ? visibility : ('private' as const),
      isImportantDate: important,
      isDemo: existing?.isDemo,
    };
    if (existing) updateEvent(existing.id, data);
    else addEvent(data);
    haptic.success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const run = () => {
      removeEvent(existing.id);
      router.back();
    };
    const msg = existing.recurrence ? 'This deletes every occurrence of the series.' : 'This can’t be undone.';
    confirmAction({ title: 'Delete this event?', message: msg, confirmLabel: 'Delete', destructive: true }).then((ok) => ok && run());
  };

  return (
    <ModalScreen
      header={<ModalHeader title={existing ? 'Event' : 'New event'} action="Save" onAction={save} actionDisabled={!title.trim()} />}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
        <View
          style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: palette.accents[accent].base, marginVertical: 6 }}
        />
        <TextInput
          value={title}
          onChangeText={setTitle}
          autoFocus={!existing && !params.title}
          placeholder="What’s happening?"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="Title"
          multiline
          style={{ flex: 1, fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: palette.text, paddingVertical: space.sm }}
        />
      </View>

      <Field icon="calendar-outline" label="Date" accent="sky">
        <DatePicker value={date} onChange={(d) => d && setDate(d)} accent="sky" />
      </Field>

      <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, paddingHorizontal: space.md }}>
        <SettingRow icon="sunny-outline" accent="sunshine" label="All day" value={allDay} onValueChange={setAllDay} />
      </View>

      {!allDay ? (
        <>
          <Field icon="time-outline" label={`Starts · ${formatTime(start)}`} accent="sky">
            <TimePicker value={start} onChange={(t) => t && setStart(t)} accent="sky" />
          </Field>
          <Field icon="hourglass-outline" label={`Ends · ${formatTime(end)}`} accent="sky">
            <ChipRow>
              {durations.map((m) => (
                <Chip key={m} label={durationLabel(m)} small accent="sky" selected={duration === m} onPress={() => setDuration(m)} />
              ))}
            </ChipRow>
          </Field>
          <Text variant="caption" tone="tertiary" style={{ marginTop: -space.md }}>
            Times shown in {timeZone.replace(/_/g, ' ')}
          </Text>
        </>
      ) : null}

      <Field icon="albums-outline" label="Calendar" accent={accent}>
        <ChipRow>
          {calendars
            .filter((c) => c.kind !== 'imported')
            .map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                small
                dot={c.color}
                accent={c.color}
                selected={calendarId === c.id}
                onPress={() => {
                  setCalendarId(c.id);
                  if (hasSpace) setVisibility(c.kind === 'personal' ? 'private' : 'shared');
                }}
              />
            ))}
        </ChipRow>
      </Field>

      {hasSpace ? (
        <Field icon="people-outline" label="Sharing" accent="sunshine">
          <Segmented
            value={visibility}
            onChange={setVisibility}
            accent="sunshine"
            options={[
              { value: 'private', label: 'Private', icon: 'lock-closed-outline' },
              { value: 'shared', label: 'Shared', icon: 'people-outline' },
            ]}
          />
          <Text variant="caption" tone="tertiary">
            {visibility === 'private' ? 'Only you can see this event.' : 'Everyone in your Our Space can see this event.'}
          </Text>
        </Field>
      ) : null}

      <Field icon="location-outline" label="Location" accent="coral">
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Add a place"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="Location"
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            paddingHorizontal: space.md,
            minHeight: 50,
            fontFamily: fonts.body,
            fontSize: 16,
            color: palette.text,
          }}
        />
      </Field>

      <Field icon="repeat" label="Repeat" accent="lavender">
        <RepeatPicker value={recurrence} onChange={setRecurrence} accent="lavender" />
      </Field>

      <Field icon="notifications-outline" label="Reminder" accent="sunshine">
        <ReminderPicker
          value={reminderMinutes}
          onChange={setReminderMinutes}
          options={[
            { label: 'None', minutes: null },
            { label: allDay ? 'On the day' : 'At start', minutes: 0 },
            { label: '10 min', minutes: 10 },
            { label: '30 min', minutes: 30 },
            { label: '1 hour', minutes: 60 },
            { label: '1 day', minutes: 1440 },
          ]}
        />
      </Field>

      <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, paddingHorizontal: space.md }}>
        <SettingRow
          icon="star-outline"
          accent="sunshine"
          label="Important date"
          detail="Birthdays and anniversaries get a spot on Home."
          value={important}
          onValueChange={setImportant}
        />
      </View>

      <Field icon="document-text-outline" label="Notes" accent="lavender">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Details, things to bring…"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="Notes"
          style={{
            minHeight: 90,
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            padding: space.md,
            fontFamily: fonts.body,
            fontSize: 16,
            color: palette.text,
            textAlignVertical: 'top',
          }}
        />
      </Field>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, opacity: 0.6 }}>
        <Icon name="attach" size={18} color={palette.textSecondary} />
        <Text variant="callout" tone="secondary">
          Attachments arrive with cloud storage.
        </Text>
      </View>

      {existing ? (
        <Button label="Delete event" icon="trash-outline" variant="danger" onPress={remove} style={{ alignSelf: 'center' }} />
      ) : null}
    </ModalScreen>
  );
}

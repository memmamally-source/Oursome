import Ionicons from '@expo/vector-icons/Ionicons';
import { addMonths, nextSaturday } from 'date-fns';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';

import type { IconName, Recurrence } from '@/features/types';
import {
  addDays,
  format,
  formatTime,
  fromDateKey,
  relativeDayLabel,
  timeFromMinutes,
  toDateKey,
  type DateKey,
  type TimeKey,
} from '@/lib/dates';
import { radius, space, useTheme, type AccentKey } from '@/theme';

import { MonthGrid } from '../calendar/MonthGrid';
import { Chip, IconButton } from '../ui/primitives';
import { Text } from '../ui/Text';

/** Labelled form section with an icon. */
export function Field({
  icon,
  label,
  children,
  accent = 'coral',
  right,
}: {
  icon: IconName;
  label: string;
  children: ReactNode;
  accent?: AccentKey;
  right?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={16} color={palette.accents[accent].ink} />
        <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
          {label}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function DatePicker({
  value,
  onChange,
  optional,
  accent = 'coral',
}: {
  value?: DateKey;
  onChange: (date?: DateKey) => void;
  optional?: boolean;
  accent?: AccentKey;
}) {
  const { palette } = useTheme();
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value ? fromDateKey(value) : today));
  const quick: { label: string; date: DateKey }[] = [
    { label: 'Today', date: toDateKey(today) },
    { label: 'Tomorrow', date: toDateKey(addDays(today, 1)) },
    { label: 'This weekend', date: toDateKey(today.getDay() === 6 ? today : nextSaturday(today)) },
    { label: 'Next week', date: toDateKey(addDays(today, 7)) },
  ];
  const isQuick = quick.some((q) => q.date === value);

  return (
    <View style={{ gap: space.md }}>
      <ChipRow>
        {optional ? <Chip label="No date" small selected={!value} accent={accent} onPress={() => onChange(undefined)} /> : null}
        {quick.map((q) => (
          <Chip key={q.label} label={q.label} small selected={value === q.date} accent={accent} onPress={() => onChange(q.date)} />
        ))}
        <Chip
          label={value && !isQuick ? format(fromDateKey(value), 'EEE d MMM') : 'Pick date'}
          icon="calendar-outline"
          small
          selected={(!!value && !isQuick) || open}
          accent={accent}
          onPress={() => setOpen(!open)}
        />
      </ChipRow>
      {value ? (
        <Text variant="caption" tone="secondary">
          {relativeDayLabel(value) === format(fromDateKey(value), 'EEEE')
            ? format(fromDateKey(value), 'EEEE d MMMM yyyy')
            : `${relativeDayLabel(value)} · ${format(fromDateKey(value), 'EEEE d MMMM yyyy')}`}
        </Text>
      ) : null}
      {open ? (
        <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton
              icon="chevron-back"
              label="Previous month"
              size={32}
              variant="plain"
              onPress={() => setMonth(addMonths(month, -1))}
            />
            <Text variant="subheading">{format(month, 'MMMM yyyy')}</Text>
            <IconButton icon="chevron-forward" label="Next month" size={32} variant="plain" onPress={() => setMonth(addMonths(month, 1))} />
          </View>
          <MonthGrid
            compact
            anchor={month}
            selected={value ?? ''}
            today={toDateKey(today)}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const TIMES: TimeKey[] = Array.from({ length: 96 }, (_, i) => timeFromMinutes(i * 15));

/** Horizontally scrolling 15-minute time chips. */
export function TimePicker({
  value,
  onChange,
  optional,
  accent = 'coral',
  from = '00:00',
}: {
  value?: TimeKey;
  onChange: (time?: TimeKey) => void;
  optional?: boolean;
  accent?: AccentKey;
  from?: TimeKey;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const options = TIMES.filter((t) => t >= from);
  const index = value ? options.indexOf(value) : options.indexOf('09:00');

  useEffect(() => {
    // Approximate chip width so the selected time scrolls into view.
    const id = setTimeout(() => ref.current?.scrollTo({ x: Math.max(0, (index + (optional ? 1 : 0)) * 86 - 90), animated: false }), 30);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}
      keyboardShouldPersistTaps="handled">
      {optional ? <Chip label="Any time" small selected={!value} accent={accent} onPress={() => onChange(undefined)} /> : null}
      {options.map((t) => (
        <Chip key={t} label={formatTime(t)} small selected={value === t} accent={accent} onPress={() => onChange(t)} />
      ))}
    </ScrollView>
  );
}

const repeatOptions: { label: string; value: Recurrence['freq'] | null }[] = [
  { label: 'Never', value: null },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export function RepeatPicker({
  value,
  onChange,
  accent = 'coral',
}: {
  value?: Recurrence | null;
  onChange: (r: Recurrence | null) => void;
  accent?: AccentKey;
}) {
  return (
    <ChipRow>
      {repeatOptions.map((o) => (
        <Chip
          key={o.label}
          label={o.label}
          small
          icon={o.value ? 'repeat' : undefined}
          accent={accent}
          selected={(value?.freq ?? null) === o.value}
          onPress={() => onChange(o.value ? { freq: o.value } : null)}
        />
      ))}
    </ChipRow>
  );
}

export function ReminderPicker({
  value,
  onChange,
  options,
  accent = 'sunshine',
}: {
  value?: number | null;
  onChange: (minutes: number | null) => void;
  options: { label: string; minutes: number | null }[];
  accent?: AccentKey;
}) {
  return (
    <ChipRow>
      {options.map((o) => (
        <Chip
          key={o.label}
          label={o.label}
          small
          accent={accent}
          selected={(value ?? null) === o.minutes}
          onPress={() => onChange(o.minutes)}
        />
      ))}
    </ChipRow>
  );
}

import { Pressable, View } from 'react-native';

import { fonts, radius, useTheme, type AccentKey } from '@/theme';
import { format, monthGrid, toDateKey, weekDays, type DateKey } from '@/lib/dates';

import { Text } from '../ui/Text';

type Props = {
  anchor: Date;
  selected: DateKey;
  today: DateKey;
  onSelect: (date: DateKey) => void;
  /** Accent dots to show under each date (max 3 rendered). */
  dots?: Record<DateKey, AccentKey[]>;
  compact?: boolean;
};

export function WeekdayHeader() {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {weekDays(new Date()).map((d) => (
        <Text
          key={d.getDay()}
          variant="caption"
          align="center"
          color={palette.textTertiary}
          style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 12 }}>
          {format(d, 'EEEEE')}
        </Text>
      ))}
    </View>
  );
}

/** Month grid used by the calendar and by date pickers. */
export function MonthGrid({ anchor, selected, today, onSelect, dots, compact }: Props) {
  const { palette } = useTheme();
  const days = monthGrid(anchor);
  const month = anchor.getMonth();
  const cell = compact ? 38 : 44;

  return (
    <View style={{ gap: 4 }}>
      <WeekdayHeader />
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {days.slice(row * 7, row * 7 + 7).map((d) => {
            const key = toDateKey(d);
            const inMonth = d.getMonth() === month;
            const isSelected = key === selected;
            const isToday = key === today;
            const dayDots = dots?.[key] ?? [];
            return (
              <Pressable
                key={key}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                aria-selected={isSelected}
                accessibilityLabel={`${format(d, 'EEEE d MMMM')}${dayDots.length ? `, ${dayDots.length} events` : ''}`}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
                <View
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? palette.accents.coral.base : isToday ? palette.accents.coral.soft : 'transparent',
                  }}>
                  <Text
                    variant="callout"
                    style={{ fontFamily: isToday || isSelected ? fonts.bodyBold : fonts.bodyMedium }}
                    color={
                      isSelected ? palette.onAccent : isToday ? palette.accents.coral.ink : inMonth ? palette.text : palette.textTertiary
                    }>
                    {d.getDate()}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 2, height: 5, marginTop: 1 }}>
                    {dayDots.slice(0, 3).map((a, i) => (
                      <View
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: isSelected ? palette.onAccent : palette.accents[a].base,
                          opacity: inMonth ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Horizontal 7-day strip with dots — the compact header for Day and Week views. */
export function WeekStrip({ anchor, selected, today, onSelect, dots }: Omit<Props, 'compact'>) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {weekDays(anchor).map((d) => {
        const key = toDateKey(d);
        const isSelected = key === selected;
        const isToday = key === today;
        const dayDots = dots?.[key] ?? [];
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            aria-selected={isSelected}
            accessibilityLabel={format(d, 'EEEE d MMMM')}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: radius.lg,
              backgroundColor: isSelected ? palette.accents.coral.base : isToday ? palette.accents.coral.soft : palette.surface,
              gap: 2,
            }}>
            <Text
              variant="caption"
              color={isSelected ? palette.onAccent : palette.textSecondary}
              style={{ fontFamily: fonts.bodyBold, fontSize: 11 }}>
              {format(d, 'EEE')}
            </Text>
            <Text variant="subheading" color={isSelected ? palette.onAccent : isToday ? palette.accents.coral.ink : palette.text}>
              {d.getDate()}
            </Text>
            <View style={{ flexDirection: 'row', gap: 2, height: 5 }}>
              {dayDots.slice(0, 3).map((a, i) => (
                <View
                  key={i}
                  style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isSelected ? palette.onAccent : palette.accents[a].base }}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

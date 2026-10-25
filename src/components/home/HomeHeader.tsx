import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Wordmark } from '@/components/brand/Logo';
import { homeGreeting, ordinal, seasonOf, type Occasion } from '@/features/home/occasions';
import { useSettings } from '@/features/settings/store';
import type { EventOccurrence, IconName, Space } from '@/features/types';
import { format, formatTime, timeKeyOf } from '@/lib/dates';
import { elevation, fonts, radius, space, useTheme, type AccentKey } from '@/theme';

import { Celebration } from '../ui/Celebration';
import { Icon } from '../ui/Icon';
import { Avatar, AvatarStack } from '../ui/primitives';
import { Reveal } from '../ui/Reveal';
import { Text } from '../ui/Text';

import { HouseholdCover, type CoverKey } from './HouseholdCover';

type Props = {
  now: Date;
  today: string;
  name?: string;
  color?: AccentKey;
  household: Space | null;
  events: number;
  toDo: number;
  overdue: number;
  next?: EventOccurrence;
  occasions: Occasion[];
  /** Beside the desktop sidebar the logo is already showing. */
  showLogo: boolean;
};

function Stat({ icon, label, accent, onPress }: { icon: IconName; label: string; accent: AccentKey; onPress: () => void }) {
  const { palette } = useTheme();
  const tone = palette.accents[accent];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        opacity: pressed ? 0.75 : 1,
      })}>
      <Icon name={icon} size={15} color={tone.ink} />
      <Text variant="caption" color={tone.ink} style={{ fontFamily: fonts.bodyBold }}>
        {label}
      </Text>
    </Pressable>
  );
}

function occasionText(o: Occasion): string {
  const when = o.when === 'today' ? 'today' : 'tomorrow';
  if (o.kind === 'anniversary' && o.years) return `Your ${ordinal(o.years)} anniversary is ${when}`;
  if (o.kind === 'birthday') return `${o.title} is ${when}${o.years ? ` (${o.years})` : ''}`;
  return `${o.title} is ${when}`;
}

/** The top of Home: the household's cover, a warm greeting and today at a glance. */
export function HomeHeader({ now, today, name, color = 'coral', household, events, toDo, overdue, next, occasions, showLogo }: Props) {
  const { palette } = useTheme();
  const celebrations = useSettings((s) => s.celebrations);
  const first = name?.split(' ')[0];
  const { hello, line } = homeGreeting(now, first, household?.name);
  const occasion = occasions[0];
  const celebrateToday = celebrations && occasion?.when === 'today';

  return (
    <View style={{ gap: space.lg, marginBottom: space.xl }}>
      {showLogo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={24} />
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            hitSlop={8}>
            <Avatar name={name ?? 'You'} accent={color} size={40} ring />
          </Pressable>
        </View>
      ) : null}

      {occasion ? (
        <Reveal>
          <View
            role="note"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              backgroundColor: palette.accents.sunshine.soft,
              borderRadius: radius.lg,
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
            }}>
            <Icon
              name={occasion.kind === 'birthday' ? 'gift' : occasion.kind === 'anniversary' ? 'heart' : 'star'}
              size={18}
              color={palette.accents.sunshine.ink}
            />
            <Text variant="callout" tone="sunshine" style={{ flex: 1 }}>
              {occasionText(occasion)}
              {occasions.length > 1 ? ` · and ${occasions.length - 1} more` : ''}
            </Text>
            {celebrateToday ? <Celebration burstKey={Number(today.replace(/-/g, ''))} /> : null}
          </View>
        </Reveal>
      ) : null}

      <View
        style={[
          { borderRadius: radius.xxl, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, minHeight: 230 },
          elevation(palette, 1),
        ]}>
        <HouseholdCover cover={(household?.cover as CoverKey) ?? 'hearth'} photo={household?.photo} season={seasonOf(now)} />
        {!showLogo ? (
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            hitSlop={8}
            style={{ position: 'absolute', top: space.lg, right: space.lg, zIndex: 1 }}>
            <Avatar name={name ?? 'You'} accent={color} size={44} ring />
          </Pressable>
        ) : null}
        <View style={{ padding: space.xl, gap: space.md, flex: 1 }}>
          {/* Re-keyed each day, so the greeting gently re-appears when the day changes. */}
          <Reveal key={today} style={{ gap: 4, maxWidth: 520 }}>
            <Text variant="overline" color={palette.accents.coral.ink}>
              {format(now, 'EEEE d MMMM')}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {hello}
            </Text>
            <Text variant="body" tone="secondary">
              {line}
            </Text>
          </Reveal>

          <Reveal delay={90}>
            <Text variant="callout" tone="secondary">
              {next
                ? `Next up: ${next.event.title} at ${formatTime(timeKeyOf(next.start))}.`
                : events || toDo
                  ? 'Nothing else on the calendar today.'
                  : 'A calm day. Make some memories.'}
            </Text>
          </Reveal>

          <View style={{ flex: 1 }} />

          <Reveal delay={160} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
              <Stat icon="calendar-outline" accent="sky" label={`${events} on today`} onPress={() => router.navigate('/calendar')} />
              <Stat icon="checkmark-circle-outline" accent="mint" label={`${toDo} to do`} onPress={() => router.navigate('/tasks')} />
              {overdue ? (
                <Stat icon="alert-circle-outline" accent="coral" label={`${overdue} overdue`} onPress={() => router.navigate('/tasks')} />
              ) : null}
            </View>
            <Pressable
              onPress={() => router.push('/household')}
              accessibilityRole="button"
              accessibilityLabel={household ? `${household.name}. Make it yours` : 'Make this home yours'}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                alignSelf: 'flex-start',
                opacity: pressed ? 0.7 : 1,
              })}>
              {household?.members.length ? <AvatarStack people={household.members} size={26} /> : null}
              <View style={{ flexShrink: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {household?.name ?? 'Make this home yours'}
                </Text>
                {household?.motto ? (
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {household.motto}
                  </Text>
                ) : null}
              </View>
              <Icon name="create-outline" size={16} color={palette.textSecondary} />
            </Pressable>
          </Reveal>
        </View>
      </View>
    </View>
  );
}

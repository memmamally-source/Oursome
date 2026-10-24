import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Wordmark } from '@/components/brand/Logo';
import type { EventOccurrence, IconName, Member } from '@/features/types';
import { format, formatTime, greetingFor, timeKeyOf } from '@/lib/dates';
import { fonts, radius, space, useTheme, type AccentKey } from '@/theme';

import { Avatar, AvatarStack } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

type Props = {
  now: Date;
  name?: string;
  color?: AccentKey;
  events: number;
  toDo: number;
  overdue: number;
  next?: EventOccurrence;
  people: Member[];
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
        height: 32,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        backgroundColor: palette.surface,
        opacity: pressed ? 0.75 : 1,
      })}>
      <Icon name={icon} size={15} color={tone.ink} />
      <Text variant="caption" color={tone.ink} style={{ fontFamily: fonts.bodyBold }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The top of Home: logo bar, then a warm greeting card with today at a glance. */
export function HomeHeader({ now, name, color = 'coral', events, toDo, overdue, next, people, showLogo }: Props) {
  const { palette, isDark } = useTheme();
  const greeting = greetingFor(now);
  const first = name?.split(' ')[0];
  const others = people.filter((p) => !p.isMe);
  const fade = isDark ? 0.12 : 0.5;

  return (
    <View style={{ gap: space.lg, marginBottom: space.xl }}>
      {showLogo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={24} />
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Profile and settings" hitSlop={8}>
            <Avatar name={name ?? 'You'} accent={color} size={40} ring />
          </Pressable>
        </View>
      ) : null}

      <View style={{ borderRadius: radius.xxl, overflow: 'hidden', padding: space.xl, gap: space.md }}>
        {/* Soft brand-colour glow behind the greeting. */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="homeHero" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={palette.accents.sunshine.soft} />
              <Stop offset="0.55" stopColor={palette.accents.coral.soft} />
              <Stop offset="1" stopColor={palette.accents.lavender.soft} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeHero)" />
          <Circle cx="92%" cy="8%" r="70" fill={palette.accents.sunshine.base} opacity={fade} />
          <Circle cx="80%" cy="100%" r="56" fill={palette.accents.sky.base} opacity={fade * 0.6} />
          <Circle cx="102%" cy="70%" r="34" fill={palette.accents.mint.base} opacity={fade * 0.7} />
        </Svg>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="overline" color={palette.accents.coral.ink}>
              {format(now, 'EEEE d MMMM')}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {greeting.text}
              {first ? `, ${first}` : ''}
              {showLogo ? '' : ` ${greeting.emoji}`}
            </Text>
          </View>
          {showLogo ? (
            <View
              importantForAccessibility="no-hide-descendants"
              style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26, lineHeight: 32 }}>{greeting.emoji}</Text>
            </View>
          ) : (
            <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Profile and settings" hitSlop={8}>
              <Avatar name={name ?? 'You'} accent={color} size={44} ring />
            </Pressable>
          )}
        </View>

        <Text variant="body" tone="secondary">
          {next
            ? `Next up: ${next.event.title} at ${formatTime(timeKeyOf(next.start))}.`
            : events || toDo
              ? 'Nothing else on the calendar today.'
              : 'A calm day — perfect for getting ahead.'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
          <Stat icon="calendar-outline" accent="sky" label={`${events} on today`} onPress={() => router.navigate('/calendar')} />
          <Stat icon="checkmark-circle-outline" accent="mint" label={`${toDo} to do`} onPress={() => router.navigate('/tasks')} />
          {overdue ? <Stat icon="alert-circle-outline" accent="coral" label={`${overdue} overdue`} onPress={() => router.navigate('/tasks')} /> : null}
          {others.length ? (
            <Pressable onPress={() => router.navigate('/space')} accessibilityRole="button" accessibilityLabel="Our Space" style={{ marginLeft: 'auto' }}>
              <AvatarStack people={people} size={28} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

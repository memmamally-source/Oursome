import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import type { Suggestion } from '@/features/dashboard/suggestions';
import type { EventOccurrence, IconName, ShoppingList, Space } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { format, formatTime, fromDateKey, relativeDayLabel, timeKeyOf } from '@/lib/dates';
import { elevation, fonts, radius, space, useTheme, type AccentKey } from '@/theme';

import { EventCard } from '../calendar/EventCard';
import { AvatarStack, Button, Card, IconButton, PressableScale, Text } from '../ui';

export function StatTile({
  icon,
  accent,
  value,
  label,
  onPress,
}: {
  icon: IconName;
  accent: AccentKey;
  value: number;
  label: string;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  const tone = palette.accents[accent];
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${value} ${label}`}
      style={{
        flex: 1,
        backgroundColor: tone.soft,
        borderRadius: radius.lg,
        paddingVertical: space.md,
        paddingHorizontal: space.sm,
        alignItems: 'center',
        gap: 4,
      }}>
      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: tone.base, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={palette.onAccent} />
      </View>
      <Text variant="number" color={tone.ink} style={{ fontSize: 26, lineHeight: 30 }}>
        {value}
      </Text>
      <Text
        variant="caption"
        color={tone.ink}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={{ fontFamily: fonts.bodyBold, fontSize: 12 }}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function QuickCapture() {
  const { palette } = useTheme();
  const [text, setText] = useState('');
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    haptic.tap();
    setText('');
    router.navigate({ pathname: '/assistant', params: { prompt: value, t: Date.now().toString() } });
  };
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: palette.surface,
          borderRadius: radius.xl,
          paddingLeft: space.lg,
          paddingRight: space.sm,
          minHeight: 60,
          borderWidth: 1.5,
          borderColor: palette.accents.lavender.soft,
        },
        elevation(palette, 1),
      ]}>
      <Ionicons name="sparkles" size={20} color={palette.accents.lavender.base} />
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        returnKeyType="send"
        placeholder="“School meeting Friday at 4”"
        placeholderTextColor={palette.textTertiary}
        accessibilityLabel="Quick capture"
        accessibilityHint="Type a task, reminder or appointment in your own words"
        style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.text, paddingVertical: space.md }}
      />
      <IconButton icon="arrow-up" label="Capture" variant="solid" accent="lavender" size={40} onPress={submit} />
    </View>
  );
}

export function SuggestionCard({
  suggestion,
  onAction,
  onDismiss,
}: {
  suggestion: Suggestion;
  onAction: () => void;
  onDismiss: () => void;
}) {
  const { palette } = useTheme();
  const tone = palette.accents[suggestion.accent];
  return (
    <Card tint={suggestion.accent} style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: palette.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name={suggestion.icon} size={19} color={tone.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" color={tone.ink}>
            Smart suggestion
          </Text>
          <Text variant="body">{suggestion.text}</Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss suggestion">
          <Ionicons name="close" size={18} color={palette.textSecondary} />
        </Pressable>
      </View>
      <Button
        label={suggestion.actionLabel}
        size="sm"
        variant="primary"
        accent={suggestion.accent}
        onPress={onAction}
        style={{ marginLeft: 48 }}
      />
    </Card>
  );
}

/** Vertical timeline of today's timed events with a "now" marker. */
export function Timeline({ timed, allDay, nowTime }: { timed: EventOccurrence[]; allDay: EventOccurrence[]; nowTime: string }) {
  const { palette } = useTheme();
  const nowIndex = timed.findIndex((o) => timeKeyOf(o.start) > nowTime);
  return (
    <View style={{ gap: space.sm }}>
      {allDay.length ? (
        <View style={{ gap: space.sm, marginBottom: space.xs, paddingLeft: 66 }}>
          {allDay.map((o) => (
            <EventCard key={o.key} occurrence={o} compact />
          ))}
        </View>
      ) : null}
      {timed.map((o, i) => (
        <View key={o.key}>
          {i === nowIndex ? <NowMarker label={formatTime(nowTime)} /> : null}
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ width: 54, paddingTop: space.lg }}>
              <Text variant="caption" tone="secondary" style={{ fontFamily: fonts.bodyBold }}>
                {formatTime(timeKeyOf(o.start))}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <EventCard occurrence={o} now={nowTime} />
            </View>
          </View>
        </View>
      ))}
      {nowIndex === -1 && timed.length && timeKeyOf(timed[timed.length - 1].end) <= nowTime ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 66, paddingTop: space.xs }}>
          <Ionicons name="checkmark-done" size={16} color={palette.accents.mint.ink} />
          <Text variant="callout" tone="mint">
            That’s everything on the calendar for today.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function NowMarker({ label }: { label: string }) {
  const { palette } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginVertical: space.xs }}
      accessibilityLabel={`Now, ${label}`}>
      <View style={{ width: 54 }}>
        <Text variant="caption" tone="coral" style={{ fontFamily: fonts.bodyBold }}>
          Now
        </Text>
      </View>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: palette.accents.coral.base }} />
      <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: palette.accents.coral.base, opacity: 0.6 }} />
    </View>
  );
}

export function SpacePreview({ space: s, sharedTasks, sharedEvents }: { space: Space | null; sharedTasks: number; sharedEvents: number }) {
  const { palette } = useTheme();
  if (!s) {
    return (
      <Card
        tint="sunshine"
        onPress={() => router.push('/space-create')}
        accessibilityLabel="Create an Our Space"
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="subheading">Better together</Text>
          <Text variant="callout" tone="secondary">
            Create an Our Space to share calendars, tasks and lists with the people you live with.
          </Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={32} color={palette.accents.sunshine.ink} />
      </Card>
    );
  }
  const pinned = s.announcements.find((a) => a.pinned) ?? s.announcements[0];
  const author = s.members.find((m) => m.id === pinned?.authorId);
  return (
    <Card onPress={() => router.navigate('/space')} accessibilityLabel={`${s.name}, ${sharedTasks} shared tasks`} style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <AvatarStack people={s.members} size={34} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading" numberOfLines={1}>
            {s.name}
          </Text>
          <Text variant="caption" tone="secondary">
            {sharedEvents} shared {sharedEvents === 1 ? 'event' : 'events'} today · {sharedTasks} open shared{' '}
            {sharedTasks === 1 ? 'task' : 'tasks'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
      </View>
      {pinned ? (
        <View
          style={{
            backgroundColor: palette.accents.sunshine.soft,
            borderRadius: radius.md,
            padding: space.md,
            flexDirection: 'row',
            gap: space.sm,
          }}>
          <Ionicons name="megaphone-outline" size={16} color={palette.accents.sunshine.ink} style={{ marginTop: 2 }} />
          <Text variant="callout" style={{ flex: 1 }} numberOfLines={2}>
            {author ? (
              <Text variant="callout" style={{ fontFamily: fonts.bodyBold }}>
                {author.isMe ? 'You' : author.name}:{' '}
              </Text>
            ) : null}
            {pinned.text}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

export function ShoppingStrip({ lists }: { lists: { list: ShoppingList; remaining: number; preview: string[] }[] }) {
  const { palette } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.md, paddingRight: space.lg }}
      style={{ marginHorizontal: -4, paddingHorizontal: 4 }}>
      {lists.map(({ list, remaining, preview }) => {
        const tone = palette.accents[list.color];
        return (
          <PressableScale
            key={list.id}
            onPress={() => router.push({ pathname: '/shopping/[id]', params: { id: list.id } })}
            accessibilityLabel={`${list.name}, ${remaining} items`}
            style={{ width: 190, backgroundColor: tone.soft, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ionicons name={list.icon} size={22} color={tone.ink} />
              {list.visibility === 'shared' ? <Ionicons name="people" size={15} color={tone.ink} accessibilityLabel="Shared" /> : null}
            </View>
            <Text variant="subheading" numberOfLines={1}>
              {list.name}
            </Text>
            <Text variant="caption" color={tone.ink} numberOfLines={2}>
              {remaining ? `${remaining} to get · ${preview.join(', ')}` : 'All done — nice work'}
            </Text>
          </PressableScale>
        );
      })}
      <PressableScale
        onPress={() => router.navigate({ pathname: '/tasks', params: { view: 'lists' } })}
        accessibilityLabel="All lists"
        style={{
          width: 110,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
        <Ionicons name="add" size={22} color={palette.textSecondary} />
        <Text variant="caption" tone="secondary">
          New list
        </Text>
      </PressableScale>
    </ScrollView>
  );
}

export function ImportantDates({ dates }: { dates: EventOccurrence[] }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {dates.slice(0, 3).map((o) => (
        <Pressable
          key={o.key}
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: o.event.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${o.event.title}, ${relativeDayLabel(o.date)}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: palette.accents.sunshine.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text variant="caption" tone="sunshine" style={{ fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12 }}>
              {format(fromDateKey(o.date), 'MMM').toUpperCase()}
            </Text>
            <Text variant="subheading" tone="sunshine" style={{ lineHeight: 20 }}>
              {Number(o.date.slice(8, 10))}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {o.event.title}
            </Text>
            <Text variant="caption" tone="secondary">
              {relativeDayLabel(o.date)}
            </Text>
          </View>
          <Ionicons
            name={/birthday/i.test(o.event.title) ? 'gift-outline' : 'heart-outline'}
            size={20}
            color={palette.accents.sunshine.ink}
          />
        </Pressable>
      ))}
    </View>
  );
}

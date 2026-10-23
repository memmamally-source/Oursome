import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNowStrict } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EventCard } from '@/components/calendar/EventCard';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Avatar, AvatarStack, Button, Card, EmptyState, IconBubble, Screen, SectionHeader, Text } from '@/components/ui';
import { expandOccurrences } from '@/features/calendar/recurrence';
import { useCalendar } from '@/features/calendar/store';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import { addDays, toDateKey } from '@/lib/dates';
import { fonts, radius, space, useTheme } from '@/theme';

export default function SpaceScreen() {
  const { palette } = useTheme();
  const s = useSpace((st) => st.space);
  const { addAnnouncement, removeAnnouncement, togglePin, leaveSpace } = useSpace.getState();
  const events = useCalendar((st) => st.events);
  const tasks = useTasks((st) => st.tasks);
  const lists = useShopping((st) => st.lists);
  const items = useShopping((st) => st.items);
  const [note, setNote] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const today = toDateKey(new Date());
  const sharedEvents = useMemo(
    () =>
      expandOccurrences(
        events.filter((e) => e.visibility === 'shared'),
        today,
        toDateKey(addDays(new Date(), 6)),
      ).slice(0, 5),
    [events, today],
  );
  const sharedTasks = tasks.filter((t) => t.visibility === 'shared' && !t.completedAt).slice(0, 6);
  const sharedLists = lists.filter((l) => l.visibility === 'shared');

  if (!s) {
    return (
      <Screen tabBar title="Our Space" subtitle="Shared life">
        <Card style={{ marginBottom: space.xl }}>
          <EmptyState
            illustration="together"
            title="Organise life together"
            body="Create a space for your household — a partner, family or housemates — to share calendars, chores and shopping lists."
            action="Create Our Space"
            onAction={() => router.push('/space-create')}
          />
        </Card>
        <PrivacyNote />
      </Screen>
    );
  }

  const me = s.members.find((m) => m.isMe);
  const isAdmin = me?.role === 'admin';
  const announcements = [...s.announcements].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt),
  );

  const post = () => {
    if (!note.trim()) return;
    addAnnouncement(note);
    setNote('');
  };

  const confirmLeave = () => {
    const msg = 'Your private items stay with you. Shared items stay with the space.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Leave ${s.name}? ${msg}`)) leaveSpace();
      return;
    }
    Alert.alert(`Leave ${s.name}?`, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: leaveSpace },
    ]);
  };

  return (
    <Screen tabBar>
      {/* Hero */}
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        style={{
          backgroundColor: palette.accents.sunshine.soft,
          borderRadius: radius.xxl,
          padding: space.xl,
          gap: space.lg,
          marginBottom: space.xxl,
          overflow: 'hidden',
        }}>
        <View
          style={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: palette.accents.sunshine.base,
            opacity: 0.35,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: 50,
            bottom: -50,
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: palette.accents.coral.base,
            opacity: 0.18,
          }}
        />
        <View>
          <Text variant="overline" tone="sunshine">
            Our Space
          </Text>
          <Text variant="title" accessibilityRole="header">
            {s.name}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <AvatarStack people={s.members} size={40} />
          <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
            {s.members.length} {s.members.length === 1 ? 'member' : 'members'}
          </Text>
          {isAdmin ? (
            <Button label="Invite" icon="person-add-outline" size="sm" accent="sunshine" onPress={() => setShowInvite(!showInvite)} />
          ) : null}
        </View>
        {showInvite ? (
          <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
            <Text variant="subheading">Invite someone</Text>
            <Text variant="callout" tone="secondary">
              Secure invite links and codes arrive with cloud accounts in the next update. Invites will expire, and you’ll approve who
              joins.
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                backgroundColor: palette.surfaceSunken,
                borderRadius: radius.md,
                padding: space.md,
                opacity: 0.6,
              }}>
              <Ionicons name="link-outline" size={18} color={palette.textSecondary} />
              <Text variant="callout" tone="secondary" style={{ letterSpacing: 2 }}>
                ••••-••••
              </Text>
              <Text variant="caption" tone="tertiary" style={{ marginLeft: 'auto' }}>
                Coming soon
              </Text>
            </View>
          </View>
        ) : null}
        {s.isDemo ? (
          <Text variant="caption" tone="sunshine">
            Sample household — Jordan is a demo member.
          </Text>
        ) : null}
      </Animated.View>

      {/* Announcements */}
      <SectionHeader title="Noticeboard" icon="megaphone-outline" accent="sunshine" />
      <View style={{ gap: space.sm, marginBottom: space.xxl }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            paddingLeft: space.lg,
            paddingRight: space.sm,
            minHeight: 52,
          }}>
          <TextInput
            value={note}
            onChangeText={setNote}
            onSubmitEditing={post}
            placeholder="Post a note for everyone…"
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel="New announcement"
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.text, paddingVertical: space.md }}
          />
          {note ? <Button label="Post" size="sm" accent="sunshine" onPress={post} /> : null}
        </View>
        {announcements.map((a) => {
          const author = s.members.find((m) => m.id === a.authorId);
          return (
            <View
              key={a.id}
              style={{
                backgroundColor: a.pinned ? palette.accents.sunshine.soft : palette.surface,
                borderRadius: radius.lg,
                padding: space.lg,
                gap: space.sm,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                {author ? <Avatar name={author.name} accent={author.color} size={26} /> : null}
                <Text variant="callout" style={{ fontFamily: fonts.bodyBold }}>
                  {author?.isMe ? 'You' : (author?.name ?? 'Someone')}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {formatDistanceToNowStrict(new Date(a.createdAt), { addSuffix: true })}
                </Text>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: space.md }}>
                  <Pressable
                    onPress={() => togglePin(a.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={a.pinned ? 'Unpin' : 'Pin'}>
                    <Ionicons
                      name={a.pinned ? 'pin' : 'pin-outline'}
                      size={16}
                      color={a.pinned ? palette.accents.sunshine.ink : palette.textTertiary}
                    />
                  </Pressable>
                  {a.authorId === me?.id || isAdmin ? (
                    <Pressable
                      onPress={() => removeAnnouncement(a.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Delete note">
                      <Ionicons name="trash-outline" size={16} color={palette.textTertiary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text variant="body">{a.text}</Text>
            </View>
          );
        })}
      </View>

      {/* Shared this week */}
      <SectionHeader
        title="Shared this week"
        icon="calendar-outline"
        accent="sky"
        action="Calendar"
        onAction={() => router.navigate('/calendar')}
      />
      <View style={{ gap: space.sm, marginBottom: space.xxl }}>
        {sharedEvents.length ? (
          sharedEvents.map((o) => <EventCard key={o.key} occurrence={o} />)
        ) : (
          <Card>
            <Text variant="callout" tone="secondary" align="center">
              No shared events this week. Mark an event as Shared to show it here.
            </Text>
          </Card>
        )}
      </View>

      {/* Shared tasks */}
      <SectionHeader
        title="Shared tasks"
        icon="checkmark-done-outline"
        accent="mint"
        action="Add"
        onAction={() => router.push({ pathname: '/task/[id]', params: { id: 'new', shared: '1' } })}
      />
      <Card padded={false} style={{ paddingHorizontal: space.md, marginBottom: space.xxl }}>
        {sharedTasks.length ? (
          sharedTasks.map((t, i) => (
            <View key={t.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
              <TaskRow task={t} />
            </View>
          ))
        ) : (
          <Text variant="callout" tone="secondary" align="center" style={{ padding: space.lg }}>
            No shared tasks right now.
          </Text>
        )}
      </Card>

      {/* Shared lists */}
      {sharedLists.length ? (
        <>
          <SectionHeader title="Shared lists" icon="basket-outline" accent="mint" />
          <View style={{ gap: space.sm, marginBottom: space.xxl }}>
            {sharedLists.map((l) => (
              <Card
                key={l.id}
                onPress={() => router.push({ pathname: '/shopping/[id]', params: { id: l.id } })}
                accessibilityLabel={l.name}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <IconBubble name={l.icon} accent={l.color} shape="square" />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{l.name}</Text>
                  <Text variant="caption" tone="secondary">
                    {items.filter((i) => i.listId === l.id && !i.purchased).length} items to get
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* Members */}
      <SectionHeader title="Members" icon="people-outline" accent="lavender" />
      <Card style={{ gap: space.md, marginBottom: space.xxl }}>
        {s.members.map((m) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name={m.name} accent={m.color} size={38} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">
                {m.name}
                {m.isMe ? ' (you)' : ''}
              </Text>
              <Text variant="caption" tone="secondary">
                {m.role === 'admin' ? 'Admin' : 'Member'}
              </Text>
            </View>
            <View
              style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: palette.accents[m.color].base }}
              accessibilityLabel={`Colour ${m.color}`}
            />
          </View>
        ))}
      </Card>

      <PrivacyNote />
      <Button
        label={`Leave ${s.name}`}
        variant="danger"
        size="sm"
        onPress={confirmLeave}
        style={{ alignSelf: 'center', marginTop: space.xl }}
      />
    </Screen>
  );
}

function PrivacyNote() {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.md,
        backgroundColor: palette.accents.lavender.soft,
        borderRadius: radius.lg,
        padding: space.lg,
      }}>
      <Ionicons name="lock-closed" size={18} color={palette.accents.lavender.ink} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" tone="lavender">
          Private stays private
        </Text>
        <Text variant="callout" tone="lavender">
          Only items you mark as Shared appear in Our Space. Your private events, tasks and lists are never shown to other members.
        </Text>
      </View>
    </View>
  );
}

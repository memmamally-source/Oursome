import { confirmAction } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { formatDistanceToNowStrict } from 'date-fns/formatDistanceToNowStrict';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { EventCard } from '@/components/calendar/EventCard';
import { JournalSection } from '@/components/journal/JournalSection';
import { FamilySharing } from '@/components/space/FamilySharing';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Avatar, AvatarStack, Button, Card, EmptyState, IconBubble, IconButton, Screen, SectionHeader, Text } from '@/components/ui';
import { expandOccurrences } from '@/features/calendar/recurrence';
import { cloudConfigured } from '@/features/cloud';
import { useCalendar } from '@/features/calendar/store';
import { eventOwner, openTasksFor } from '@/features/people/logic';
import { useShopping } from '@/features/shopping/store';
import { belongsTo } from '@/features/space/families';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { Member } from '@/features/types';
import { addDays, relativeDayLabel, toDateKey } from '@/lib/dates';
import { fonts, radius, space, useTheme } from '@/theme';

export default function SpaceScreen() {
  const { palette } = useTheme();
  const s = useSpace((st) => st.space);
  const spaces = useSpace((st) => st.spaces);
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
        events.filter((e) => !!s && belongsTo(e, s.id, spaces)),
        today,
        toDateKey(addDays(new Date(), 6)),
      ).slice(0, 5),
    [events, today, s, spaces],
  );
  // Only what's shared with the family being viewed.
  const sharedTasks = tasks.filter((t) => !!s && belongsTo(t, s.id, spaces) && !t.completedAt).slice(0, 6);
  const sharedLists = lists.filter((l) => !!s && belongsTo(l, s.id, spaces));

  if (!s) {
    return (
      <Screen tabBar title="Our Space" subtitle="Shared life">
        <Card style={{ marginBottom: space.xl }}>
          <EmptyState
            illustration="together"
            title="Organise life together"
            body="Create a family for your household (a partner, children, housemates) to share calendars, chores and shopping lists. You can add more families later, like your parents' or a co-parenting group."
            action="Create a family"
            onAction={() => router.push('/space-create')}
          />
        </Card>
        <Button
          label="Or just add the people you plan with"
          variant="ghost"
          accent="sunshine"
          icon="person-add-outline"
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new' } })}
          style={{ marginBottom: space.xl }}
        />
        {cloudConfigured ? (
          <Button
            label="Join a family with an invite code"
            variant="ghost"
            accent="sunshine"
            icon="key-outline"
            onPress={() => router.push('/join')}
            style={{ marginBottom: space.xl, marginTop: -space.md }}
          />
        ) : null}
        <JournalSection />
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
    const msg = 'Your private items stay with you. Items shared with this family stay with it.';
    confirmAction({ title: `Leave ${s.name}?`, message: msg, confirmLabel: 'Leave', destructive: true }).then((ok) => ok && leaveSpace());
  };

  return (
    <Screen tabBar>
      <FamilySwitcher />

      {/* Hero */}
      <View
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
            {spaces.length > 1 ? 'Family' : 'Our Space'}
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
          {isAdmin || s.cloudId ? (
            <Button
              label={s.cloudId ? 'Sharing' : 'Invite'}
              icon={s.cloudId ? 'cloud-done-outline' : 'person-add-outline'}
              size="sm"
              accent="sunshine"
              onPress={() => setShowInvite(!showInvite)}
            />
          ) : null}
        </View>
        {showInvite ? <FamilySharing family={s} isAdmin={isAdmin} /> : null}
        {s.isDemo ? (
          <Text variant="caption" tone="sunshine">
            Sample household — Jordan is a demo member.
          </Text>
        ) : null}
      </View>

      <JournalSection />

      <PeopleSection members={s.members} />

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
                    <Icon
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
                      <Icon name="trash-outline" size={16} color={palette.textTertiary} />
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
                <Icon name="chevron-forward" size={18} color={palette.textTertiary} />
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
      <Icon name="lock-closed" size={18} color={palette.accents.lavender.ink} style={{ marginTop: 2 }} />
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

/** Everyone in the household, each linked to their tasks and calendar. */
function PeopleSection({ members }: { members: Member[] }) {
  const { palette } = useTheme();
  const tasks = useTasks((st) => st.tasks);
  const events = useCalendar((st) => st.events);
  const calendars = useCalendar((st) => st.calendars);
  const now = new Date();
  const today = toDateKey(now);
  const upcoming = expandOccurrences(events, today, toDateKey(addDays(now, 14)));

  return (
    <View style={{ marginBottom: space.xxl }}>
      <SectionHeader title="People" icon="people-outline" accent="lavender" />
      <View style={{ backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border }}>
        {members.map((m, i) => {
          const open = openTasksFor(m, tasks);
          const overdue = open.filter((t) => t.due && t.due < today).length;
          const next = upcoming.find((o) => eventOwner(o.event, calendars) === m.id);
          const summary = [
            open.length ? `${open.length} open ${open.length === 1 ? 'task' : 'tasks'}` : 'No open tasks',
            overdue ? `${overdue} overdue` : null,
            next ? `next: ${next.event.title}, ${relativeDayLabel(next.date)}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <View
              key={m.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: palette.border,
              }}>
              <Pressable
                onPress={() => router.push({ pathname: '/person/[id]', params: { id: m.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${m.isMe ? 'You' : m.name}. ${summary}`}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Avatar name={m.name} accent={m.color} size={44} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {m.isMe ? `${m.name} (you)` : m.name}
                    {m.relationship ? (
                      <Text variant="callout" tone="secondary">
                        {'  '}
                        {m.relationship}
                      </Text>
                    ) : null}
                  </Text>
                  <Text variant="caption" tone={overdue ? 'danger' : 'secondary'} numberOfLines={2}>
                    {summary}
                  </Text>
                </View>
              </Pressable>
              <IconButton
                icon="calendar-clear-outline"
                label={`${m.isMe ? 'My' : `${m.name}’s`} calendar`}
                size={36}
                variant="soft"
                accent="sky"
                onPress={() => router.navigate({ pathname: '/calendar', params: { person: m.id } })}
              />
            </View>
          );
        })}
        <Pressable
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new' } })}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderTopWidth: 1,
            borderTopColor: palette.border,
          }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: palette.textTertiary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="add" size={22} color={palette.textSecondary} />
          </View>
          <Text variant="body" tone="secondary">
            Add a person
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Every family the user belongs to; tap one to view it, or add another. */
function FamilySwitcher() {
  const { palette } = useTheme();
  const spaces = useSpace((st) => st.spaces);
  const activeId = useSpace((st) => st.activeId);
  const switchSpace = useSpace((st) => st.switchSpace);
  return (
    <View style={{ marginBottom: space.xl }}>
      <SectionHeader title="Families" icon="home-outline" accent="coral" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
        {spaces.map((f) => {
          const active = f.id === activeId;
          return (
            <Pressable
              key={f.id}
              onPress={() => switchSpace(f.id)}
              accessibilityRole="tab"
              aria-selected={active}
              accessibilityLabel={`${f.name}, ${f.members.length} ${f.members.length === 1 ? 'member' : 'members'}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingLeft: 6,
                paddingRight: space.lg,
                height: 52,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: active ? palette.accents.sunshine.base : palette.border,
                backgroundColor: active ? palette.accents.sunshine.soft : palette.surface,
                opacity: pressed ? 0.8 : 1,
              })}>
              <AvatarStack people={f.members.slice(0, 3)} size={30} />
              <View>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {f.name}
                </Text>
                <Text variant="caption" tone="secondary">
                  {f.members.length} {f.members.length === 1 ? 'member' : 'members'}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push('/space-create')}
          accessibilityRole="button"
          accessibilityLabel="Add a family"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: space.lg,
            height: 52,
            borderRadius: radius.pill,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: palette.textTertiary,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="add" size={20} color={palette.textSecondary} />
          <Text variant="callout" tone="secondary" style={{ fontFamily: fonts.bodyBold }}>
            Add a family
          </Text>
        </Pressable>
        {cloudConfigured ? (
          <Pressable
            onPress={() => router.push('/join')}
            accessibilityRole="button"
            accessibilityLabel="Join a family with a code"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: space.lg,
              height: 52,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: palette.textTertiary,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="key-outline" size={18} color={palette.textSecondary} />
            <Text variant="callout" tone="secondary" style={{ fontFamily: fonts.bodyBold }}>
              Join with a code
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

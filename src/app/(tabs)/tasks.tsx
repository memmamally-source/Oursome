import { Icon } from '@/components/ui/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { TaskRow } from '@/components/tasks/TaskRow';
import { Avatar, Button, Card, Celebration, Chip, EmptyState, IconButton, PressableScale, Screen, Segmented, Text } from '@/components/ui';
import { parseCapture } from '@/features/assistant/parser';
import { isTaskFor } from '@/features/people/logic';
import { useSettings } from '@/features/settings/store';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { groupOpenTasks, taskGroupLabels } from '@/features/tasks/logic';
import { useTasks } from '@/features/tasks/store';
import type { IconName, Task } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { format, todayKey } from '@/lib/dates';
import { accentKeys, elevation, fonts, layout, radius, space, useTheme, type AccentKey } from '@/theme';

type Filter = 'all' | 'today' | 'shared' | `cat:${string}` | `person:${string}`;

export default function TasksScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [tab, setTab] = useState<'tasks' | 'lists'>(params.view === 'lists' ? 'lists' : 'tasks');
  const [seenView, setSeenView] = useState(params.view);
  if (params.view !== seenView) {
    setSeenView(params.view);
    if (params.view === 'lists') setTab('lists');
  }

  return (
    <Screen tabBar>
      <View style={{ marginBottom: space.lg }}>
        <Text variant="overline" tone="mint">
          {format(new Date(), 'EEEE d MMMM')}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {tab === 'tasks' ? 'Tasks' : 'Shopping lists'}
        </Text>
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        accent="mint"
        options={[
          { value: 'tasks', label: 'Tasks', icon: 'checkmark-circle-outline' },
          { value: 'lists', label: 'Shopping', icon: 'basket-outline' },
        ]}
      />
      <View style={{ height: space.xl }} />
      {tab === 'tasks' ? <TasksView /> : <ListsView />}
    </Screen>
  );
}

function TasksView() {
  const { palette } = useTheme();
  const tasks = useTasks((s) => s.tasks);
  const categories = useTasks((s) => s.categories);
  const move = useTasks((s) => s.move);
  const sortMode = useSettings((s) => s.taskSortMode);
  const setSortMode = useSettings((s) => s.setTaskSortMode);
  const members = useSpace((s) => s.people);
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const today = todayKey();

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (filter === 'today') return !!t.due && t.due <= today;
        if (filter.startsWith('person:')) {
          const m = members.find((x) => x.id === filter.slice(7));
          return !!m && isTaskFor(t, m);
        }
        if (filter === 'shared') return t.visibility === 'shared';
        if (filter.startsWith('cat:')) return t.categoryId === filter.slice(4);
        return true;
      }),
    [tasks, filter, today, members],
  );
  const groups = groupOpenTasks(filtered, today, sortMode);
  const completed = filtered.filter((t) => t.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));

  const quickAdd = () => {
    const text = draft.trim();
    if (!text) return;
    // Reuse the capture parser so "Call mum tomorrow at 5" arrives with its date and time,
    // then open the full task page to check the details and save.
    const parsed = parseCapture(text, { now: new Date(), members: [] });
    const p =
      parsed.type === 'proposals'
        ? parsed.proposals.find((x) => x.kind !== 'shopping')
        : parsed.type === 'clarify'
          ? parsed.pending[0]
          : undefined;
    const person = filter.startsWith('person:') ? members.find((m) => m.id === filter.slice(7)) : undefined;
    haptic.tap();
    setDraft('');
    router.push({
      pathname: '/task/[id]',
      params: {
        id: 'new',
        title: p?.title ?? text,
        date: p?.date ?? (filter === 'today' ? today : ''),
        time: p?.allDay ? '' : (p?.time ?? ''),
        categoryId: filter.startsWith('cat:') ? filter.slice(4) : (p?.categoryId ?? ''),
        reminder: p?.kind === 'reminder' ? '1' : '',
        shared: filter === 'shared' ? '1' : '',
        assigneeId: person && !person.isMe ? person.id : '',
      },
    });
  };

  const onCompleted = (t: Task) => {
    const remainingToday = tasks.filter((x) => !x.completedAt && x.due && x.due <= today && x.id !== t.id && !x.isReminder).length;
    if (t.priority === 'high' || (t.due && t.due <= today && remainingToday === 0)) setBurst(Date.now());
  };

  return (
    <View style={{ gap: space.lg }}>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            paddingLeft: space.lg,
            paddingRight: space.sm,
            minHeight: 56,
          },
          elevation(palette, 1),
        ]}>
        <Icon name="add-circle-outline" size={22} color={palette.accents.mint.ink} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={quickAdd}
          returnKeyType="done"
          blurOnSubmit={false}
          placeholder="Add a task…"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="New task"
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.text, paddingVertical: space.md }}
        />
        {draft ? <IconButton icon="arrow-up" label="Add task" variant="solid" accent="mint" size={36} onPress={quickAdd} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingRight: space.sm }}
          style={{ flex: 1 }}>
          <Chip label="All" small selected={filter === 'all'} accent="mint" onPress={() => setFilter('all')} />
          <Chip label="Today" small selected={filter === 'today'} accent="coral" onPress={() => setFilter('today')} />
          {members.length > 1
            ? members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setFilter(filter === `person:${m.id}` ? 'all' : `person:${m.id}`)}
                  accessibilityRole="button"
                  aria-selected={filter === `person:${m.id}`}
                  accessibilityLabel={m.isMe ? 'My tasks' : `${m.name}’s tasks`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    height: 30,
                    paddingLeft: 3,
                    paddingRight: 10,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: filter === `person:${m.id}` ? palette.accents[m.color].base : palette.border,
                    backgroundColor: filter === `person:${m.id}` ? palette.accents[m.color].soft : palette.surface,
                  }}>
                  <Avatar name={m.name} accent={m.color} size={22} />
                  <Text variant="caption" style={{ fontFamily: fonts.bodyBold }}>
                    {m.isMe ? 'Mine' : m.name.split(' ')[0]}
                  </Text>
                </Pressable>
              ))
            : null}
          <Chip
            label="Shared"
            small
            icon="people-outline"
            selected={filter === 'shared'}
            accent="sunshine"
            onPress={() => setFilter('shared')}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              small
              dot={c.color}
              accent={c.color}
              selected={filter === `cat:${c.id}`}
              onPress={() => setFilter(`cat:${c.id}`)}
            />
          ))}
        </ScrollView>
        <IconButton
          icon={sortMode === 'smart' ? 'sparkles-outline' : 'reorder-four-outline'}
          label={sortMode === 'smart' ? 'Smart order. Switch to my order' : 'My order. Switch to smart order'}
          size={34}
          variant="soft"
          accent="mint"
          onPress={() => setSortMode(sortMode === 'smart' ? 'manual' : 'smart')}
        />
      </View>
      <Text variant="caption" tone="tertiary" style={{ marginTop: -space.sm }}>
        {sortMode === 'smart' ? 'Sorted by date and priority' : 'Your order — use the arrows to rearrange'}
      </Text>

      <View>
        {groups.length === 0 ? (
          <Card>
            <EmptyState
              illustration="checklist"
              title={filter === 'all' ? 'A clean slate' : 'Nothing here'}
              body={filter === 'all' ? 'Add your first task above, or tap + to capture anything.' : 'No open tasks match this filter.'}
            />
          </Card>
        ) : (
          groups.map((g) => (
            <View key={g.key} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
                <Text variant="subheading" tone={g.key === 'overdue' ? 'danger' : 'primary'}>
                  {taskGroupLabels[g.key]}
                </Text>
                <View
                  style={{ backgroundColor: palette.surfaceSunken, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 }}>
                  <Text variant="caption" tone="secondary" style={{ fontFamily: fonts.bodyBold }}>
                    {g.tasks.length}
                  </Text>
                </View>
              </View>
              <Card padded={false} style={{ paddingHorizontal: space.md }}>
                {g.tasks.map((t, i) => (
                  <View key={t.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
                    <TaskRow
                      task={t}
                      showDate={g.key === 'upcoming' || g.key === 'overdue'}
                      onCompleted={onCompleted}
                      reorder={
                        sortMode === 'manual'
                          ? {
                              onUp:
                                i > 0
                                  ? () =>
                                      move(
                                        t.id,
                                        -1,
                                        g.tasks.map((x) => x.id),
                                      )
                                  : undefined,
                              onDown:
                                i < g.tasks.length - 1
                                  ? () =>
                                      move(
                                        t.id,
                                        1,
                                        g.tasks.map((x) => x.id),
                                      )
                                  : undefined,
                            }
                          : undefined
                      }
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
        <Celebration burstKey={burst} />
      </View>

      {completed.length ? (
        <View>
          <Pressable
            onPress={() => setShowDone(!showDone)}
            accessibilityRole="button"
            aria-expanded={showDone}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}>
            <Icon name="checkmark-done-circle" size={20} color={palette.accents.mint.ink} />
            <Text variant="subheading">Completed</Text>
            <Text variant="callout" tone="secondary">
              {completed.length}
            </Text>
            <Icon name={showDone ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textSecondary} style={{ marginLeft: 'auto' }} />
          </Pressable>
          {showDone ? (
            <Card padded={false} style={{ paddingHorizontal: space.md, marginTop: space.sm }}>
              {completed.slice(0, 50).map((t, i) => (
                <View key={t.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
                  <TaskRow task={t} />
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const listIcons: IconName[] = [
  'basket-outline',
  'cart-outline',
  'construct-outline',
  'medkit-outline',
  'gift-outline',
  'paw-outline',
  'leaf-outline',
  'shirt-outline',
];

function ListsView() {
  const { palette } = useTheme();
  const lists = useShopping((s) => s.lists);
  const items = useShopping((s) => s.items);
  const addList = useShopping((s) => s.addList);
  const hasSpace = useSpace((s) => !!s.space);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<AccentKey>('mint');
  const [icon, setIcon] = useState<IconName>('basket-outline');
  const [shared, setShared] = useState(hasSpace);

  const create = () => {
    if (!name.trim()) return;
    const list = addList({ name: name.trim(), color, icon, visibility: shared && hasSpace ? 'shared' : 'private' });
    setCreating(false);
    setName('');
    router.push({ pathname: '/shopping/[id]', params: { id: list.id } });
  };

  return (
    <View style={{ gap: space.lg }}>
      {lists.length === 0 && !creating ? (
        <Card>
          <EmptyState
            illustration="basket"
            title="No lists yet"
            body="Make a grocery list and share it — when one person adds milk, everyone sees it."
            action="Create a list"
            onAction={() => setCreating(true)}
          />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {lists.map((l) => {
          const tone = palette.accents[l.color];
          const open = items.filter((i) => i.listId === l.id && !i.purchased);
          const done = items.filter((i) => i.listId === l.id && i.purchased).length;
          const total = open.length + done;
          return (
            <PressableScale
              key={l.id}
              onPress={() => router.push({ pathname: '/shopping/[id]', params: { id: l.id } })}
              accessibilityLabel={`${l.name}, ${open.length} items left`}
              style={{
                width: '47.5%',
                flexGrow: 1,
                backgroundColor: tone.soft,
                borderRadius: radius.xl,
                padding: space.lg,
                gap: space.sm,
                minHeight: 150,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: tone.base,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name={l.icon} size={20} color={palette.onAccent} />
                </View>
                <Icon
                  name={l.visibility === 'shared' ? 'people' : 'lock-closed'}
                  size={15}
                  color={tone.ink}
                  accessibilityLabel={l.visibility === 'shared' ? 'Shared' : 'Private'}
                />
              </View>
              <Text variant="subheading" numberOfLines={1}>
                {l.name}
              </Text>
              <Text variant="caption" color={tone.ink} numberOfLines={2}>
                {open.length
                  ? open
                      .slice(0, 3)
                      .map((i) => i.name)
                      .join(', ') + (open.length > 3 ? '…' : '')
                  : 'All done'}
              </Text>
              <View style={{ marginTop: 'auto', height: 6, borderRadius: 3, backgroundColor: palette.surface, overflow: 'hidden' }}>
                <View style={{ width: total ? `${(done / total) * 100}%` : '0%', height: '100%', backgroundColor: tone.base }} />
              </View>
              <Text variant="caption" color={tone.ink} style={{ fontFamily: fonts.bodyBold }}>
                {open.length} to get
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {creating ? (
        <Card style={{ gap: space.md }}>
          <Text variant="subheading">New list</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder="e.g. Groceries, Pharmacy, Party"
            placeholderTextColor={palette.textTertiary}
            onSubmitEditing={create}
            accessibilityLabel="List name"
            style={{
              fontFamily: fonts.heading,
              fontSize: 18,
              color: palette.text,
              paddingVertical: space.sm,
              borderBottomWidth: 1.5,
              borderBottomColor: palette.border,
            }}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {accentKeys.map((a) => (
              <Pressable
                key={a}
                onPress={() => setColor(a)}
                accessibilityRole="radio"
                aria-selected={color === a}
                accessibilityLabel={a}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: palette.accents[a].base,
                  borderWidth: 3,
                  borderColor: color === a ? palette.text : 'transparent',
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {listIcons.map((i) => (
              <Pressable
                key={i}
                onPress={() => setIcon(i)}
                accessibilityRole="radio"
                aria-selected={icon === i}
                accessibilityLabel={i.replace('-outline', '')}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: icon === i ? palette.accents[color].soft : palette.surfaceSunken,
                }}>
                <Icon name={i} size={20} color={icon === i ? palette.accents[color].ink : palette.textSecondary} />
              </Pressable>
            ))}
          </View>
          {hasSpace ? (
            <Chip
              label={shared ? 'Shared with Our Space' : 'Private to you'}
              icon={shared ? 'people' : 'lock-closed'}
              accent="sunshine"
              selected={shared}
              onPress={() => setShared(!shared)}
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Create list" onPress={create} disabled={!name.trim()} accent="mint" />
            <Button label="Cancel" variant="ghost" accent="lavender" onPress={() => setCreating(false)} />
          </View>
        </Card>
      ) : lists.length ? (
        <Button
          label="New list"
          icon="add"
          variant="soft"
          accent="mint"
          onPress={() => setCreating(true)}
          style={{ alignSelf: 'center' }}
        />
      ) : null}
      <View style={{ height: layout.tabBarMargin }} />
    </View>
  );
}

import { Icon } from '@/components/ui/Icon';
import { router } from 'expo-router';
import { Animated, Pressable, View } from 'react-native';

import { useOrb } from '@/components/brand/Orb';
import { toast } from '@/components/ui/Toast';
import { useFoldAway } from '@/components/ui/useFoldAway';

import { memberById, useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { Task } from '@/features/types';
import { formatTime, relativeDayLabel, todayKey } from '@/lib/dates';
import { radius, space, useTheme } from '@/theme';

import { Avatar } from '../ui/primitives';
import { Checkbox } from '../ui/Checkbox';
import { Text } from '../ui/Text';

type Props = {
  task: Task;
  onCompleted?: (task: Task) => void;
  showDate?: boolean;
  /** Render as a standalone card (Home) instead of a list row. */
  card?: boolean;
  reorder?: { onUp?: () => void; onDown?: () => void };
};

let completedThisSession = 0;

/** The orb celebrates now and then: important tasks, clearing today, or every fourth tick. */
function shouldCelebrate(task: Task): boolean {
  completedThisSession += 1;
  if (task.priority === 'high' || completedThisSession % 4 === 0) return true;
  const today = todayKey();
  return !useTasks.getState().tasks.some((t) => !t.completedAt && t.id !== task.id && t.due && t.due <= today);
}

export function TaskRow({ task, onCompleted, showDate = true, card, reorder }: Props) {
  const { palette } = useTheme();
  const toggle = useTasks((s) => s.toggleComplete);
  const { style: foldStyle, onLayout, run, folding } = useFoldAway();

  /** Tick: the checkbox springs, the row folds away, and a toast offers Undo. */
  const completeNow = () =>
    run(() => {
      const celebrate = shouldCelebrate(task);
      const undo = useTasks.getState().complete(task.id);
      onCompleted?.(task);
      if (celebrate) useOrb.getState().celebrate();
      if (undo) toast({ message: `Done: ${task.title}`, action: { label: 'Undo', onPress: undo } });
    });
  const category = useTasks((s) => s.categories.find((c) => c.id === task.categoryId));
  const people = useSpace((s) => s.people);
  const assignee = memberById(people, task.assigneeId);
  const done = !!task.completedAt;
  const overdue = !done && !!task.due && task.due < todayKey();
  const accent = category?.color ?? 'lavender';
  const subDone = task.subtasks.filter((s) => s.done).length;

  const meta: string[] = [];
  if (showDate && task.due) meta.push(relativeDayLabel(task.due));
  if (task.dueTime) meta.push(formatTime(task.dueTime));
  if (task.subtasks.length) meta.push(`${subDone}/${task.subtasks.length}`);

  return (
    <Animated.View onLayout={onLayout} style={foldStyle}>
      <Pressable
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${task.due ? `, due ${relativeDayLabel(task.due)}` : ''}${done ? ', completed' : ''}`}
        accessibilityHint="Opens task details"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: space.md,
          paddingHorizontal: card ? space.lg : space.xs,
          backgroundColor: card ? palette.surface : 'transparent',
          borderRadius: card ? radius.lg : 0,
          opacity: pressed ? 0.75 : 1,
        })}>
        <Checkbox
          checked={done || folding}
          label={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
          onToggle={() => (done ? toggle(task.id) : completeNow())}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {task.isReminder ? <Icon name="notifications" size={14} color={palette.accents.sunshine.ink} /> : null}
            <Text
              variant="body"
              numberOfLines={2}
              style={{ flexShrink: 1, textDecorationLine: done ? 'line-through' : 'none' }}
              tone={done ? 'tertiary' : 'primary'}>
              {task.title}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accents[accent].base }} />
              <Text variant="caption" tone="secondary">
                {category?.name ?? 'Other'}
              </Text>
            </View>
            {meta.length ? (
              <Text variant="caption" tone={overdue ? 'danger' : 'secondary'}>
                · {meta.join(' · ')}
              </Text>
            ) : null}
            {task.recurrence ? <Icon name="repeat" size={12} color={palette.textSecondary} accessibilityLabel="Repeats" /> : null}
            {task.visibility === 'shared' ? (
              <Icon name="people" size={12} color={palette.accents.sunshine.ink} accessibilityLabel="Shared" />
            ) : null}
            {task.priority === 'high' && !done ? (
              <Icon name="flag" size={12} color={palette.accents.coral.ink} accessibilityLabel="High priority" />
            ) : null}
          </View>
        </View>
        {assignee ? (
          <Avatar name={assignee.name} accent={assignee.color} size={26} />
        ) : task.assigneeName ? (
          <View
            accessibilityLabel={`Suggested for ${task.assigneeName}`}
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: palette.textTertiary,
              borderRadius: 13,
              paddingHorizontal: 8,
              height: 26,
              justifyContent: 'center',
            }}>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {task.assigneeName}
            </Text>
          </View>
        ) : null}
        {reorder ? (
          <View style={{ gap: 2 }}>
            <Pressable
              onPress={reorder.onUp}
              disabled={!reorder.onUp}
              hitSlop={6}
              accessibilityLabel={`Move ${task.title} up`}
              style={{ opacity: reorder.onUp ? 1 : 0.25 }}>
              <Icon name="chevron-up" size={20} color={palette.textSecondary} />
            </Pressable>
            <Pressable
              onPress={reorder.onDown}
              disabled={!reorder.onDown}
              hitSlop={6}
              accessibilityLabel={`Move ${task.title} down`}
              style={{ opacity: reorder.onDown ? 1 : 0.25 }}>
              <Icon name="chevron-down" size={20} color={palette.textSecondary} />
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

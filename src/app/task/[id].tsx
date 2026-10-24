import { Icon } from '@/components/ui/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, TextInput, View } from 'react-native';

import { ChipRow, DatePicker, Field, RepeatPicker, ReminderPicker, TimePicker } from '@/components/forms/Fields';
import { Avatar, Button, Chip, ModalHeader, ModalScreen, Segmented, SettingRow, Text } from '@/components/ui';
import { ME_ID, useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { Priority, Subtask, Task } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { createId } from '@/lib/id';
import { formatTime } from '@/lib/dates';
import { accentKeys, fonts, radius, space, useTheme, type AccentKey } from '@/theme';

type Params = {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  categoryId?: string;
  assigneeId?: string;
  reminder?: string;
  shared?: string;
};

export default function TaskEditor() {
  const params = useLocalSearchParams<Params>();
  const { palette } = useTheme();
  const existing = useTasks((s) => s.tasks.find((t) => t.id === params.id));
  const categories = useTasks((s) => s.categories);
  const { addTask, updateTask, removeTask, toggleComplete, addCategory } = useTasks.getState();
  const space_ = useSpace((s) => s.space);
  const isNew = !existing;

  const [title, setTitle] = useState(existing?.title ?? params.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? (params.categoryId || 'personal'));
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [due, setDue] = useState(existing?.due ?? (params.date || undefined));
  const [dueTime, setDueTime] = useState(existing?.dueTime ?? (params.time || undefined));
  const [recurrence, setRecurrence] = useState(existing?.recurrence ?? null);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(existing?.reminderMinutes ?? (params.reminder ? 0 : null));
  const [isReminder, setIsReminder] = useState(existing?.isReminder ?? !!params.reminder);
  const [visibility, setVisibility] = useState(existing?.visibility ?? (params.shared || params.assigneeId ? 'shared' : 'private'));
  const [assigneeId, setAssigneeId] = useState(existing?.assigneeId ?? (params.assigneeId || undefined));
  // A name the organiser heard for someone not yet in the household.
  const [suggested, setSuggested] = useState(existing?.assigneeId ? undefined : existing?.assigneeName);
  const assign = (id: string) => {
    setAssigneeId(id === ME_ID ? undefined : id);
    setSuggested(undefined);
    // Someone else's task has to be visible to them.
    if (id !== ME_ID) setVisibility('shared');
  };
  const [subtasks, setSubtasks] = useState<Subtask[]>(existing?.subtasks ?? []);
  const [subDraft, setSubDraft] = useState('');
  const [newCat, setNewCat] = useState<{ name: string; color: AccentKey } | null>(null);

  const save = () => {
    if (!title.trim()) return;
    const data: Omit<Task, 'id' | 'createdAt' | 'order'> = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      categoryId,
      priority,
      due,
      dueTime: due ? dueTime : undefined,
      recurrence: due ? recurrence : null,
      reminderMinutes: due ? reminderMinutes : null,
      isReminder,
      visibility: space_ ? visibility : 'private',
      assigneeId: space_ && visibility === 'shared' && assigneeId !== ME_ID ? assigneeId : undefined,
      assigneeName: suggested,
      subtasks,
      completedAt: existing?.completedAt,
      isDemo: existing?.isDemo,
    };
    if (existing) updateTask(existing.id, data);
    else addTask(data);
    haptic.success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const run = () => {
      removeTask(existing.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this task?')) run();
      return;
    }
    Alert.alert('Delete task?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const addSub = () => {
    if (!subDraft.trim()) return;
    setSubtasks([...subtasks, { id: createId('st_'), title: subDraft.trim(), done: false }]);
    setSubDraft('');
  };

  const category = categories.find((c) => c.id === categoryId);

  return (
    <ModalScreen
      header={
        <ModalHeader
          title={isNew ? (isReminder ? 'New reminder' : 'New task') : isReminder ? 'Reminder' : 'Task'}
          action="Save"
          onAction={save}
          actionDisabled={!title.trim()}
        />
      }>
      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus={isNew && !params.title}
        placeholder={isReminder ? 'Remind me to…' : 'What needs doing?'}
        placeholderTextColor={palette.textTertiary}
        accessibilityLabel="Title"
        multiline
        style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: palette.text, paddingVertical: space.sm }}
      />

      <Field icon="pricetag-outline" label="Category" accent={category?.color}>
        <ChipRow>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              small
              dot={c.color}
              accent={c.color}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
          <Chip label="New" small icon="add" accent="lavender" onPress={() => setNewCat({ name: '', color: 'lavender' })} />
        </ChipRow>
        {newCat ? (
          <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.md, gap: space.md }}>
            <TextInput
              value={newCat.name}
              onChangeText={(name) => setNewCat({ ...newCat, name })}
              autoFocus
              placeholder="Category name"
              placeholderTextColor={palette.textTertiary}
              accessibilityLabel="Category name"
              style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: palette.text, paddingVertical: 4 }}
            />
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              {accentKeys.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => setNewCat({ ...newCat, color: a })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: newCat.color === a }}
                  accessibilityLabel={a}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: palette.accents[a].base,
                    borderWidth: 3,
                    borderColor: newCat.color === a ? palette.text : 'transparent',
                  }}
                />
              ))}
              <Button
                label="Add"
                size="sm"
                style={{ marginLeft: 'auto' }}
                disabled={!newCat.name.trim()}
                onPress={() => {
                  const c = addCategory({ name: newCat.name.trim(), color: newCat.color, icon: 'pricetag-outline' });
                  setCategoryId(c.id);
                  setNewCat(null);
                }}
              />
            </View>
          </View>
        ) : null}
      </Field>

      <Field icon="flag-outline" label="Priority">
        <Segmented
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High', icon: 'flag' },
          ]}
        />
      </Field>

      <Field icon="calendar-outline" label="Due">
        <DatePicker value={due} onChange={setDue} optional />
      </Field>

      {due ? (
        <>
          <Field icon="time-outline" label={dueTime ? `Time · ${formatTime(dueTime)}` : 'Time'}>
            <TimePicker value={dueTime} onChange={setDueTime} optional />
          </Field>
          <Field icon="repeat" label="Repeat">
            <RepeatPicker value={recurrence} onChange={setRecurrence} />
          </Field>
          <Field icon="notifications-outline" label="Reminder" accent="sunshine">
            <ReminderPicker
              value={reminderMinutes}
              onChange={setReminderMinutes}
              options={[
                { label: 'None', minutes: null },
                { label: dueTime ? 'At time' : 'On the day (9 AM)', minutes: 0 },
                { label: '15 min before', minutes: 15 },
                { label: '1 hour before', minutes: 60 },
                { label: '1 day before', minutes: 1440 },
              ]}
            />
            <Text variant="caption" tone="tertiary">
              Notifications are delivered by your phone and may be delayed by system settings. Delivery switches on in the next update.
            </Text>
          </Field>
        </>
      ) : null}

      <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, paddingHorizontal: space.md }}>
        <SettingRow
          icon="notifications"
          accent="sunshine"
          label="Show as a reminder"
          detail="Reminders appear with a bell and in your reminder count."
          value={isReminder}
          onValueChange={setIsReminder}
        />
      </View>

      {space_ ? (
        <Field icon="person-outline" label="Who’s doing it?" accent="lavender">
          <ChipRow>
            {space_.members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => assign(m.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: (assigneeId ?? ME_ID) === m.id }}
                accessibilityLabel={`Assign to ${m.isMe ? 'me' : m.name}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingLeft: 4,
                  paddingRight: 12,
                  height: 32,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: (assigneeId ?? ME_ID) === m.id && !suggested ? palette.accents[m.color].base : palette.border,
                  backgroundColor: (assigneeId ?? ME_ID) === m.id && !suggested ? palette.accents[m.color].soft : palette.surface,
                }}>
                <Avatar name={m.name} accent={m.color} size={24} />
                <Text variant="callout">{m.id === ME_ID ? 'Me' : m.name}</Text>
              </Pressable>
            ))}
            <Chip
              label="Someone new"
              small
              icon="person-add-outline"
              accent="sunshine"
              onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new' } })}
            />
          </ChipRow>
          {suggested ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: palette.accents.sunshine.soft, borderRadius: radius.md, padding: space.md }}>
              <Text variant="callout" style={{ flex: 1 }}>
                Noted for “{suggested}”, who isn’t in your household yet.
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new', name: suggested } })}
                accessibilityRole="button"
                hitSlop={8}>
                <Text variant="callout" tone="sunshine" style={{ fontFamily: fonts.bodyBold }}>
                  Add {suggested}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Field>
      ) : null}

      {space_ ? (
        <Field icon="people-outline" label="Sharing" accent="sunshine">
          <Segmented
            value={visibility}
            onChange={setVisibility}
            accent="sunshine"
            options={[
              { value: 'private', label: 'Private', icon: 'lock-closed-outline' },
              { value: 'shared', label: space_.name, icon: 'people-outline' },
            ]}
          />
          <Text variant="caption" tone="tertiary">
            {visibility === 'private'
              ? assigneeId && assigneeId !== ME_ID
                ? 'Private tasks can only be yours — choosing someone else shares it.'
                : 'Only you can see this.'
              : `Everyone in ${space_.name} can see this.`}
          </Text>
        </Field>
      ) : null}

      <Field
        icon="list-outline"
        label={`Subtasks${subtasks.length ? ` · ${subtasks.filter((s) => s.done).length}/${subtasks.length}` : ''}`}
        accent="mint">
        <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, paddingHorizontal: space.md }}>
          {subtasks.map((st, i) => (
            <View
              key={st.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: palette.border,
              }}>
              <Pressable
                onPress={() => setSubtasks(subtasks.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: st.done }}
                accessibilityLabel={st.title}
                hitSlop={8}>
                <Icon
                  name={st.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={st.done ? palette.accents.mint.base : palette.textTertiary}
                />
              </Pressable>
              <Text
                variant="body"
                style={{ flex: 1, textDecorationLine: st.done ? 'line-through' : 'none' }}
                tone={st.done ? 'tertiary' : 'primary'}>
                {st.title}
              </Text>
              <Pressable
                onPress={() => setSubtasks(subtasks.filter((x) => x.id !== st.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${st.title}`}>
                <Icon name="close" size={18} color={palette.textTertiary} />
              </Pressable>
            </View>
          ))}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingVertical: space.sm,
              borderTopWidth: subtasks.length ? 1 : 0,
              borderTopColor: palette.border,
            }}>
            <Icon name="add" size={22} color={palette.accents.mint.ink} />
            <TextInput
              value={subDraft}
              onChangeText={setSubDraft}
              onSubmitEditing={addSub}
              blurOnSubmit={false}
              placeholder="Add a step"
              placeholderTextColor={palette.textTertiary}
              accessibilityLabel="Add subtask"
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.text, paddingVertical: space.sm }}
            />
          </View>
        </View>
      </Field>

      <Field icon="document-text-outline" label="Notes" accent="lavender">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Anything else to remember?"
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

      {existing ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            label={existing.completedAt ? 'Mark as not done' : 'Mark complete'}
            icon={existing.completedAt ? 'arrow-undo' : 'checkmark'}
            variant="soft"
            accent="mint"
            onPress={() => {
              toggleComplete(existing.id);
              router.back();
            }}
          />
          <Button label="Delete" icon="trash-outline" variant="danger" onPress={remove} />
        </View>
      ) : null}
    </ModalScreen>
  );
}

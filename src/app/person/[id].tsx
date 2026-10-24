import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EventCard } from '@/components/calendar/EventCard';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Avatar, Button, Chip, ModalHeader, ModalScreen, Text, TextField } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { useAssistant } from '@/features/assistant/store';
import { expandOccurrences } from '@/features/calendar/recurrence';
import { useCalendar } from '@/features/calendar/store';
import { eventOwner, openTasksFor } from '@/features/people/logic';
import { addPerson, claimSuggestedTasks, removePerson } from '@/features/people/service';
import { useSpace } from '@/features/space/store';
import { compareTasks } from '@/features/tasks/logic';
import { useTasks } from '@/features/tasks/store';
import type { Member } from '@/features/types';
import { addDays, relativeDayLabel, toDateKey } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';

const RELATIONS = ['partner', 'wife', 'husband', 'mum', 'dad', 'son', 'daughter', 'sister', 'brother', 'friend', 'housemate'];

/** /person/new (optionally ?relation=wife&proposal=…) or /person/<id>. */
export default function PersonScreen() {
  const params = useLocalSearchParams<{ id: string; relation?: string; proposal?: string; edit?: string }>();
  const person = useSpace((s) => s.space?.members.find((m) => m.id === params.id));
  if (params.id === 'new' || (person && params.edit)) {
    return <PersonForm person={person} relation={params.relation} proposalId={params.proposal} />;
  }
  if (!person) {
    return (
      <ModalScreen header={<ModalHeader title="Person" />}>
        <Text variant="body" tone="secondary">
          This person isn’t in your household any more.
        </Text>
      </ModalScreen>
    );
  }
  return <PersonView person={person} />;
}

function PersonView({ person }: { person: Member }) {
  const { palette } = useTheme();
  const tasks = useTasks((s) => s.tasks);
  const events = useCalendar((s) => s.events);
  const calendars = useCalendar((s) => s.calendars);
  const now = new Date();
  const today = toDateKey(now);
  const open = openTasksFor(person, tasks).sort(compareTasks);
  const upcoming = expandOccurrences(
    events.filter((e) => eventOwner(e, calendars) === person.id),
    today,
    toDateKey(addDays(now, 14)),
  ).slice(0, 8);
  const name = person.isMe ? 'You' : person.name;

  return (
    <ModalScreen
      header={
        <ModalHeader
          title={person.isMe ? 'Your plate' : person.name}
          action="Edit"
          onAction={() => router.setParams({ edit: '1' })}
        />
      }>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Avatar name={person.name} accent={person.color} size={72} />
        <Text variant="heading">{person.name}</Text>
        <Text variant="callout" tone="secondary">
          {[person.isMe ? 'You' : person.relationship ? capital(person.relationship) : null, person.kind === 'person' ? 'No account' : null, person.invitePending ? 'Invite prepared' : null]
            .filter(Boolean)
            .join(' · ') || 'Household member'}
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="subheading">{open.length ? `${name === 'You' ? 'Your' : `${name}’s`} tasks` : 'Tasks'}</Text>
        {open.length ? (
          <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, paddingHorizontal: space.lg }}>
            {open.map((t) => (
              <TaskRow key={t.id} task={t} showDate />
            ))}
          </View>
        ) : (
          <Text variant="callout" tone="secondary">
            Nothing assigned. Try “{person.isMe ? 'Remind me to' : `${person.name.split(' ')[0]} needs to`} …” in the organiser.
          </Text>
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="subheading">Next two weeks</Text>
        {upcoming.length ? (
          upcoming.map((o) => (
            <View key={o.key} style={{ gap: 4 }}>
              <Text variant="caption" tone="tertiary">
                {relativeDayLabel(o.date)}
              </Text>
              <EventCard occurrence={o} compact />
            </View>
          ))
        ) : (
          <Text variant="callout" tone="secondary">
            No events {person.isMe ? 'for you' : `for ${person.name.split(' ')[0]}`} yet.
          </Text>
        )}
      </View>

      <Button
        label={person.isMe ? 'Ask the organiser' : `Plan something for ${person.name.split(' ')[0]}`}
        icon="sparkles"
        variant="secondary"
        accent="lavender"
        onPress={() => router.push('/quick-add')}
      />
    </ModalScreen>
  );
}

function PersonForm({ person, relation, proposalId }: { person?: Member; relation?: string; proposalId?: string }) {
  const { palette } = useTheme();
  const [name, setName] = useState(person?.name ?? '');
  const [rel, setRel] = useState(person?.relationship ?? relation ?? '');
  const [aliases, setAliases] = useState((person?.aliases ?? []).join(', '));
  const [invite, setInvite] = useState(person?.invitePending ?? false);
  const tasks = useTasks((s) => s.tasks);
  const key = name.trim().toLowerCase();
  const suggested = key ? tasks.filter((t) => !t.completedAt && !t.assigneeId && t.assigneeName?.trim().toLowerCase() === key) : [];
  const [claim, setClaim] = useState(true);
  const taken = useSpace((s) => !!key && !!s.space?.members.some((m) => m.id !== person?.id && m.name.trim().toLowerCase() === key));

  const save = () => {
    const clean = name.trim();
    if (!clean) return;
    const patch = {
      name: clean,
      relationship: rel.trim() || undefined,
      aliases: aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      invitePending: invite || undefined,
    };
    let saved: Member;
    if (person) {
      useSpace.getState().updatePerson(person.id, patch);
      saved = { ...person, ...patch };
    } else {
      saved = addPerson({ name: clean, relationship: patch.relationship });
      useSpace.getState().updatePerson(saved.id, { aliases: patch.aliases, invitePending: patch.invitePending });
    }
    if (claim && suggested.length) claimSuggestedTasks(saved);
    if (proposalId) useAssistant.getState().decidePerson(proposalId, { type: 'member', member: saved });
    haptic.success();
    router.back();
  };

  return (
    <ModalScreen header={<ModalHeader title={person ? 'Edit person' : 'Add a person'} action="Save" onAction={save} actionDisabled={!name.trim()} />}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Rufaida" autoFocus={!person} onSubmitEditing={save} />
      {taken ? (
        <Text variant="caption" tone="sunshine">
          Someone with this name is already in your household. That’s fine — aliases help tell them apart.
        </Text>
      ) : null}

      {!person?.isMe ? (
        <View style={{ gap: space.sm }}>
          <Text variant="callout" tone="secondary">
            How do you refer to them? (optional)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {RELATIONS.map((r) => (
              <Chip key={r} small label={capital(r)} selected={rel === r} accent="lavender" onPress={() => setRel(rel === r ? '' : r)} />
            ))}
          </View>
          <TextField value={rel} onChangeText={setRel} placeholder="Or type one, e.g. grandma" />
          <Text variant="caption" tone="tertiary">
            The organiser only understands “my {rel || 'wife'}” once you set it here — it never guesses.
          </Text>
        </View>
      ) : null}

      <TextField label="Other names (optional)" value={aliases} onChangeText={setAliases} placeholder="e.g. Ru, Mum" />

      {!person?.isMe ? (
        <Pressable
          onPress={() => setInvite(!invite)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: invite }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: palette.border }}>
          <Icon name={invite ? 'checkbox' : 'square-outline'} size={22} color={palette.accents.sky.ink} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Prepare an invitation</Text>
            <Text variant="caption" tone="secondary">
              Nothing is sent now. You’ll be able to send it when cloud sharing arrives.
            </Text>
          </View>
        </Pressable>
      ) : null}

      {suggested.length ? (
        <Pressable
          onPress={() => setClaim(!claim)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: claim }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: palette.accents.sunshine.soft, borderRadius: radius.lg, padding: space.md }}>
          <Icon name={claim ? 'checkbox' : 'square-outline'} size={22} color={palette.accents.sunshine.ink} />
          <Text variant="callout" style={{ flex: 1 }}>
            Give them the {suggested.length} {suggested.length === 1 ? 'task' : 'tasks'} you noted for “{name.trim()}”
          </Text>
        </Pressable>
      ) : null}

      {person && !person.isMe ? (
        <Button
          label={`Remove ${person.name}`}
          variant="ghost"
          accent="coral"
          icon="trash-outline"
          onPress={() => {
            removePerson(person.id);
            router.back();
          }}
          accessibilityHint="Their tasks stay, unassigned"
        />
      ) : null}
    </ModalScreen>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

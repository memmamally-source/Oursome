import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { DatePicker, TimePicker } from '@/components/forms/Fields';
import { blockingIssue, type Assignee, type Proposal } from '@/features/assistant/proposals';
import { describeProposal } from '@/features/assistant/resolve';
import { useAssistant } from '@/features/assistant/store';
import { useSpace } from '@/features/space/store';
import type { IconName } from '@/features/types';
import { useLayout } from '@/hooks/useLayout';
import { formatTime, relativeDayLabel } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { fonts, radius, space, useTheme, type AccentKey } from '@/theme';

import { Avatar, Button, Chip } from '../ui/primitives';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

const kindMeta: Record<Proposal['kind'], { icon: IconName; accent: AccentKey; add: string }> = {
  task: { icon: 'checkmark-circle', accent: 'mint', add: 'Add task' },
  reminder: { icon: 'notifications', accent: 'sunshine', add: 'Add reminder' },
  event: { icon: 'calendar', accent: 'sky', add: 'Add event' },
  shopping: { icon: 'basket', accent: 'mint', add: 'Add to list' },
  update: { icon: 'create-outline', accent: 'lavender', add: 'Update' },
  person: { icon: 'person-add', accent: 'sunshine', add: 'Add person' },
};

function MetaChip({ icon, label, accent }: { icon: IconName; label: string; accent?: AccentKey }) {
  const { palette } = useTheme();
  const tone = accent ? palette.accents[accent] : undefined;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        height: 28,
        borderRadius: radius.pill,
        backgroundColor: tone?.soft ?? palette.surfaceSunken,
      }}>
      <Icon name={icon} size={13} color={tone?.ink ?? palette.textSecondary} />
      <Text variant="caption" color={tone?.ink ?? palette.textSecondary} style={{ fontFamily: fonts.bodyBold }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Inline choices when the assistant needs to know who someone is. */
function PersonDecision({ proposal, a }: { proposal: Proposal; a: Assignee }) {
  const { palette } = useTheme();
  const decide = useAssistant((s) => s.decidePerson);
  const members = useSpace((s) => s.people);
  if (a.status === 'unknown') {
    return (
      <View style={{ gap: space.sm }}>
        <Text variant="callout" tone="secondary">
          I don’t know {a.name} yet. What would you like to do?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Chip
            small
            icon="person-add-outline"
            accent="sunshine"
            label={`Add ${a.name}`}
            onPress={() => decide(proposal.id, { type: 'add', name: a.name })}
          />
          <Chip
            small
            icon="mail-outline"
            accent="sky"
            label={`Invite ${a.name}`}
            onPress={() => decide(proposal.id, { type: 'add', name: a.name, invite: true })}
          />
          <Chip small label="Keep name only" onPress={() => decide(proposal.id, { type: 'keep' })} />
          <Chip small label="Leave unassigned" onPress={() => decide(proposal.id, { type: 'unassign' })} />
        </View>
        <Text variant="caption" tone="tertiary">
          Adding someone doesn’t create an account or send anything. Invitations go out once cloud sharing is ready.
        </Text>
      </View>
    );
  }
  const options = a.status === 'ambiguous' ? a.candidates : members.filter((m) => !m.isMe || a.status === 'unclear');
  const question =
    a.status === 'ambiguous'
      ? `Which ${a.name} do you mean?`
      : a.status === 'relation_unset'
        ? `Who is your ${a.relation}?`
        : 'Who is this for?';
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="callout" tone="secondary">
        {question}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((m) => (
          <Pressable
            key={m.id}
            onPress={() =>
              decide(proposal.id, { type: 'member', member: m, rememberRelation: a.status === 'relation_unset' ? a.relation : undefined })
            }
            accessibilityRole="button"
            accessibilityLabel={m.isMe ? 'Me' : m.name}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingLeft: 4,
              paddingRight: 12,
              height: 32,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}>
            <Avatar name={m.name} accent={m.color} size={24} />
            <Text variant="callout">{m.isMe ? 'Me' : m.name}</Text>
          </Pressable>
        ))}
        {a.status === 'relation_unset' ? (
          <Chip
            small
            icon="person-add-outline"
            accent="sunshine"
            label="Someone new"
            onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'new', relation: a.relation, proposal: proposal.id } })}
          />
        ) : null}
        <Chip small label="Leave unassigned" onPress={() => decide(proposal.id, { type: 'unassign' })} />
      </View>
      {a.status === 'relation_unset' ? (
        <Text variant="caption" tone="tertiary">
          I’ll remember this so “my {a.relation}” works next time.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A reviewable suggestion from the organiser. Nothing is saved until the
 * user taps the main button; titles, dates and people can be adjusted inline.
 */
export function ProposalCard({ proposal: p }: { proposal: Proposal }) {
  const { palette } = useTheme();
  const { isTablet } = useLayout();
  // Phones use the full card width for choices; wider screens line up under the sentence.
  const indent = isTablet ? 44 : 0;
  const { approve, dismiss, edit } = useAssistant.getState();
  const [editing, setEditing] = useState<'none' | 'all' | 'date'>('none');
  const [error, setError] = useState<string | null>(null);
  const meta = kindMeta[p.kind];
  const tone = palette.accents[meta.accent];
  const a = p.update?.changes.assignee ?? p.assignee;
  const needsPerson = !!a && ['unknown', 'ambiguous', 'relation_unset', 'unclear'].includes(a.status);
  const issue = blockingIssue(p);
  const date = p.update?.changes.date ?? p.date;
  const time = p.update?.changes.time ?? p.time;

  if (p.status === 'dismissed') return null;
  if (p.status === 'saved') {
    const what = p.kind === 'shopping' ? (p.items ?? []).join(', ') : p.title;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs }}>
        <Icon name="checkmark-circle" size={20} color={palette.accents.mint.ink} />
        <Text variant="callout" style={{ flex: 1 }} numberOfLines={2}>
          {p.kind === 'person' ? `${p.title} added to your household` : p.kind === 'update' ? `Updated “${p.title}”` : `Added “${what}”`}
        </Text>
      </View>
    );
  }

  const save = () => {
    const err = approve(p.id);
    setError(err);
    if (!err) haptic.success();
  };

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.border,
        padding: space.lg,
        gap: space.md,
      }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
        <View
          style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={meta.icon} size={17} color={tone.ink} />
        </View>
        <Text variant="body" style={{ flex: 1 }}>
          {describeProposal(p, new Date())}
        </Text>
        <Pressable onPress={() => dismiss(p.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss suggestion">
          <Icon name="close" size={18} color={palette.textTertiary} />
        </Pressable>
      </View>

      {a || date || p.location || (p.kind !== 'shopping' && p.kind !== 'person') ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: indent }}>
          {a ? <MetaChip icon="person" label={a.status === 'me' ? 'You' : a.name} accent={needsPerson ? 'sunshine' : 'lavender'} /> : null}
          {date ? (
            <MetaChip icon="calendar-outline" label={relativeDayLabel(date)} />
          ) : p.kind !== 'shopping' && p.kind !== 'person' ? (
            <MetaChip icon="calendar-outline" label="No date" />
          ) : null}
          {time && !p.allDay ? <MetaChip icon="time-outline" label={formatTime(time)} /> : null}
          {p.location ? <MetaChip icon="location-outline" label={p.location} /> : null}
        </View>
      ) : null}

      {p.assumptions.length ? (
        <View style={{ paddingLeft: indent, gap: 2 }}>
          {p.assumptions.map((x) => (
            <Text key={x} variant="caption" tone="sunshine">
              {x}
            </Text>
          ))}
        </View>
      ) : null}

      {needsPerson && a ? (
        <View style={{ paddingLeft: indent }}>
          <PersonDecision proposal={p} a={a} />
        </View>
      ) : null}

      {editing !== 'none' ? (
        <View style={{ gap: space.md, paddingLeft: indent }}>
          {editing === 'all' && p.kind !== 'shopping' && p.kind !== 'person' && p.kind !== 'update' ? (
            <TextInput
              value={p.title}
              onChangeText={(title) => edit(p.id, { title })}
              accessibilityLabel="Title"
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 16,
                color: palette.text,
                backgroundColor: palette.surfaceSunken,
                borderRadius: radius.md,
                paddingHorizontal: space.md,
                height: 44,
              }}
            />
          ) : null}
          <DatePicker value={date} onChange={(d) => edit(p.id, { date: d })} optional={p.kind !== 'event'} />
          {editing === 'all' || p.kind === 'event' ? (
            <TimePicker value={time} onChange={(t) => edit(p.id, { time: t, allDay: !t })} optional />
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" tone="danger" style={{ paddingLeft: indent }}>
          {error}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: indent }}>
        <Button label={meta.add} size="sm" icon="checkmark" onPress={save} disabled={!!issue} />
        {p.kind !== 'person' && p.kind !== 'shopping' ? (
          <Button
            label={editing === 'all' ? 'Done' : 'Edit'}
            size="sm"
            variant="secondary"
            onPress={() => setEditing(editing === 'all' ? 'none' : 'all')}
          />
        ) : null}
        {!date && p.kind !== 'shopping' && p.kind !== 'person' && editing === 'none' ? (
          <Button label="Choose date" size="sm" variant="ghost" accent="coral" icon="calendar-outline" onPress={() => setEditing('date')} />
        ) : null}
      </View>
    </View>
  );
}

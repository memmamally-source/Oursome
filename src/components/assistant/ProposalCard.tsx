import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { describeWhen, type Proposal } from '@/features/assistant/parser';
import { memberById, useSpace } from '@/features/space/store';
import type { IconName } from '@/features/types';
import { fonts, radius, space, useTheme, type AccentKey } from '@/theme';

import { Button } from '../ui/primitives';
import { Text } from '../ui/Text';

const kindMeta: Record<Proposal['kind'], { label: string; icon: IconName; accent: AccentKey }> = {
  task: { label: 'Task', icon: 'checkmark-circle-outline', accent: 'mint' },
  reminder: { label: 'Reminder', icon: 'notifications-outline', accent: 'sunshine' },
  event: { label: 'Calendar event', icon: 'calendar-outline', accent: 'sky' },
  shopping: { label: 'Shopping list', icon: 'basket-outline', accent: 'mint' },
};

export type ProposalStatus = 'pending' | 'saved' | 'dismissed';

/**
 * Review card for a proposed change. Nothing is saved until the user taps
 * "Add" — the title can be edited inline, and anything the parser assumed
 * is highlighted for a quick check.
 */
export function ProposalCard({
  proposal,
  status,
  onApprove,
  onDismiss,
  onEdit,
  index = 0,
}: {
  proposal: Proposal;
  status: ProposalStatus;
  onApprove: (p: Proposal) => void;
  onDismiss: () => void;
  onEdit?: (p: Proposal) => void;
  index?: number;
}) {
  const { palette } = useTheme();
  const meta = kindMeta[proposal.kind];
  const tone = palette.accents[meta.accent];
  const [title, setTitle] = useState(proposal.title);
  const space_ = useSpace((s) => s.space);
  const assignee = memberById(space_, proposal.assigneeId);
  const when = describeWhen(proposal);
  const done = status !== 'pending';

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.xl,
        padding: space.lg,
        gap: space.md,
        borderWidth: 1.5,
        borderColor: status === 'saved' ? palette.accents.mint.base : palette.border,
        opacity: status === 'dismissed' ? 0.5 : 1,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View
          style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={meta.icon} size={16} color={tone.ink} />
        </View>
        <Text variant="overline" color={tone.ink}>
          {meta.label}
        </Text>
        {status === 'saved' ? (
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="checkmark-circle" size={16} color={palette.accents.mint.ink} />
            <Text variant="caption" tone="mint" style={{ fontFamily: fonts.bodyBold }}>
              Saved
            </Text>
          </View>
        ) : null}
      </View>

      {proposal.kind === 'shopping' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(proposal.items ?? []).map((item) => (
            <View
              key={item}
              style={{ backgroundColor: palette.accents.mint.soft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text variant="callout" tone="mint">
                {item}
              </Text>
            </View>
          ))}
          {proposal.listName ? (
            <Text variant="caption" tone="secondary" style={{ alignSelf: 'center' }}>
              → {proposal.listName}
            </Text>
          ) : null}
        </View>
      ) : (
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!done}
          accessibilityLabel="Title"
          style={{ fontFamily: fonts.heading, fontSize: 18, color: palette.text, padding: 0 }}
        />
      )}

      {when || proposal.location || assignee ? (
        <View style={{ gap: 6 }}>
          {when ? <MetaLine icon="time-outline" text={when} /> : null}
          {proposal.location ? <MetaLine icon="location-outline" text={proposal.location} /> : null}
          {assignee ? <MetaLine icon="person-outline" text={`For ${assignee.name} · shared`} /> : null}
        </View>
      ) : null}

      {proposal.assumptions.length && !done ? (
        <View style={{ backgroundColor: palette.accents.sunshine.soft, borderRadius: radius.md, padding: space.md, gap: 4 }}>
          {proposal.assumptions.map((a) => (
            <View key={a} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <Icon name="help-circle-outline" size={15} color={palette.accents.sunshine.ink} style={{ marginTop: 2 }} />
              <Text variant="caption" tone="sunshine" style={{ flex: 1 }}>
                {a}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!done ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button
            label="Add"
            icon="checkmark"
            size="sm"
            onPress={() => onApprove({ ...proposal, title: title.trim() || proposal.title })}
          />
          {onEdit && proposal.kind !== 'shopping' ? (
            <Button
              label="Edit details"
              variant="secondary"
              size="sm"
              onPress={() => onEdit({ ...proposal, title: title.trim() || proposal.title })}
            />
          ) : null}
          <Button label="Dismiss" variant="ghost" accent="lavender" size="sm" onPress={onDismiss} />
        </View>
      ) : null}
    </View>
  );
}

function MetaLine({ icon, text }: { icon: IconName; text: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={15} color={palette.textSecondary} />
      <Text variant="callout" tone="secondary">
        {text}
      </Text>
    </View>
  );
}

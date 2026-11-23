import { View } from 'react-native';

import { Chip, Segmented, Text } from '@/components/ui';
import { cloudConfigured } from '@/features/cloud';
import { useSpace } from '@/features/space/store';
import type { Visibility } from '@/features/types';

import { ChipRow, Field } from './Fields';

type Props = {
  visibility: Visibility;
  onVisibility: (v: Visibility) => void;
  /** The family it's shared with (when shared). */
  spaceId?: string;
  onFamily: (id: string) => void;
  /** "this event", "this list"… for the explanation line. */
  what?: string;
  /** Without the "Sharing" field frame (e.g. inside a panel that has its own title). */
  bare?: boolean;
};

/**
 * Private or shared, and with which family when there's more than one. Says
 * plainly when a family isn't shared online yet, so nobody wonders why it
 * doesn't appear on the other person's phone.
 */
export function SharingField({ visibility, onVisibility, spaceId, onFamily, what = 'this', bare }: Props) {
  const spaces = useSpace((s) => s.spaces);
  if (!spaces.length) return null;
  const family = spaces.find((f) => f.id === spaceId) ?? spaces[0];
  const offline = cloudConfigured && !family.cloudId;

  const body = (
    <View style={{ gap: 10 }}>
      <Segmented
        value={visibility}
        onChange={(v) => {
          onVisibility(v);
          if (v === 'shared' && !spaceId) onFamily(family.id);
        }}
        accent="lavender"
        options={[
          { value: 'private', label: 'Private', icon: 'lock-closed-outline' },
          { value: 'shared', label: spaces.length > 1 ? 'Shared' : family.name, icon: 'people-outline' },
        ]}
      />
      {visibility === 'shared' && spaces.length > 1 ? (
        <ChipRow>
          {spaces.map((f) => (
            <Chip
              key={f.id}
              small
              label={f.name}
              icon={f.cloudId ? 'cloud-done-outline' : undefined}
              accent="lavender"
              selected={family.id === f.id}
              onPress={() => onFamily(f.id)}
            />
          ))}
        </ChipRow>
      ) : null}
      <Text variant="caption" tone="tertiary">
        {visibility === 'private'
          ? `Only you can see ${what}.`
          : `Everyone in ${family.name} can see ${what}.` +
            (offline ? ` ${family.name} isn’t shared online yet, so for now it stays on this phone: share it from Our Space.` : '')}
      </Text>
    </View>
  );
  return bare ? body : (
    <Field icon="people-outline" label="Sharing" accent="lavender">
      {body}
    </Field>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Illustration } from '@/components/illustrations/Illustration';
import { Chip, ModalHeader, ModalScreen, Text, TextField } from '@/components/ui';
import { useSession } from '@/features/session/store';
import { useSpace } from '@/features/space/store';
import { space } from '@/theme';

const ideas = ['Our Home', 'The Family', 'Us Two', 'Flat 4B'];

export default function CreateSpace() {
  const profile = useSession((s) => s.profile);
  const [name, setName] = useState('');

  const create = () => {
    useSpace.getState().createSpace(name || 'Our Home', { name: profile?.name ?? 'You', color: profile?.color ?? 'coral' });
    router.back();
    router.navigate('/space');
  };

  return (
    <ModalScreen header={<ModalHeader title="Create Our Space" action="Create" onAction={create} actionDisabled={!name.trim()} />}>
      <View style={{ alignItems: 'center' }}>
        <Illustration name="together" width={200} />
      </View>
      <Text variant="body" tone="secondary" align="center">
        A shared home for your calendars, chores and lists. You’ll be the admin and can invite others once cloud sync arrives.
      </Text>
      <TextField
        label="Name your space"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Our Home"
        autoFocus
        onSubmitEditing={create}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {ideas.map((i) => (
          <Chip key={i} label={i} accent="sunshine" selected={name === i} onPress={() => setName(i)} />
        ))}
      </View>
    </ModalScreen>
  );
}

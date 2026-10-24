import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Illustration } from '@/components/illustrations/Illustration';
import { Chip, ModalHeader, ModalScreen, Text, TextField } from '@/components/ui';
import { useSession } from '@/features/session/store';
import { useSpace } from '@/features/space/store';
import { space } from '@/theme';

const ideas = ['Our Home', 'Mum & Dad', 'The Kids', 'Grandparents', 'Housemates'];

export default function CreateSpace() {
  const profile = useSession((s) => s.profile);
  const [name, setName] = useState('');

  const hasFamily = useSpace((s) => s.spaces.length > 0);
  const create = () => {
    useSpace.getState().createSpace(name || 'Our Home', { name: profile?.name ?? 'You', color: profile?.color ?? 'coral' });
    router.back();
    router.navigate('/space');
  };

  return (
    <ModalScreen header={<ModalHeader title={hasFamily ? 'Add a family' : 'Create a family'} action="Create" onAction={create} actionDisabled={!name.trim()} />}>
      <View style={{ alignItems: 'center' }}>
        <Illustration name="together" width={200} />
      </View>
      <Text variant="body" tone="secondary" align="center">
        {hasFamily
          ? 'Another group you organise with, like your parents, a co-parenting arrangement or housemates. Each family has its own people, noticeboard and shared items.'
          : 'A shared home for your calendars, chores and lists. You’ll be the admin and can invite others once cloud sync arrives.'}
      </Text>
      <TextField
        label="Name this family"
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

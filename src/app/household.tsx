import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { COVERS, coverNames, HouseholdCover, type CoverKey } from '@/components/home/HouseholdCover';
import { AvatarStack, Button, ModalHeader, ModalScreen, Text, TextField } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { seasonOf } from '@/features/home/occasions';
import { useSession } from '@/features/session/store';
import { useSpace } from '@/features/space/store';
import { pickPhoto } from '@/lib/photos';
import { radius, space, useTheme } from '@/theme';

/** "Make it yours": the household's name, motto, cover scene or photo. */
export default function HouseholdScreen() {
  const { palette } = useTheme();
  const profile = useSession((s) => s.profile);
  const s = useSpace((st) => st.space);
  const [name, setName] = useState(s?.name ?? 'Our Home');
  const [motto, setMotto] = useState(s?.motto ?? '');
  const [cover, setCover] = useState<CoverKey>((s?.cover as CoverKey) ?? 'hearth');
  const [photo, setPhoto] = useState<string | undefined>(s?.photo);

  const save = () => {
    if (!useSpace.getState().space) useSpace.getState().createSpace(name, { name: profile?.name ?? 'You', color: profile?.color ?? 'coral' });
    useSpace.getState().updateHousehold({ name, motto, cover, photo });
    toast({ message: 'Your home is updated' });
    router.back();
  };

  const choosePhoto = async () => {
    const uri = await pickPhoto({ maxSize: 1000, aspect: [2, 1] });
    if (uri) setPhoto(uri);
  };

  return (
    <ModalScreen header={<ModalHeader title="Make it yours" action="Save" onAction={save} actionDisabled={!name.trim()} />}>
      {/* Live preview */}
      <View style={{ height: 150, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: palette.border }}>
        <HouseholdCover cover={cover} photo={photo} season={seasonOf(new Date())} />
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: space.lg, gap: 2 }}>
          <Text variant="title" numberOfLines={1}>
            {name.trim() || 'Our Home'}
          </Text>
          {motto.trim() ? (
            <Text variant="callout" tone="secondary" numberOfLines={1}>
              {motto}
            </Text>
          ) : null}
          {s?.members.length ? <AvatarStack people={s.members} size={26} /> : null}
        </View>
      </View>

      <TextField label="Household name" value={name} onChangeText={setName} placeholder="e.g. The Riveras, Flat 4B" maxLength={40} />
      <TextField label="Motto (optional)" value={motto} onChangeText={setMotto} placeholder="e.g. Coffee first, then chaos" maxLength={80} />

      <View style={{ gap: space.sm }}>
        <Text variant="callout" tone="secondary">
          Cover
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {COVERS.map((c) => {
            const selected = !photo && cover === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  setPhoto(undefined);
                  setCover(c);
                }}
                accessibilityRole="radio"
                aria-checked={selected}
                accessibilityLabel={`${coverNames[c]} cover`}
                style={{ width: '31%', flexGrow: 1, gap: 4 }}>
                <View
                  style={{
                    height: 64,
                    borderRadius: radius.md,
                    overflow: 'hidden',
                    borderWidth: selected ? 2.5 : 1,
                    borderColor: selected ? palette.accents.coral.base : palette.border,
                  }}>
                  <HouseholdCover cover={c} />
                </View>
                <Text variant="caption" tone={selected ? 'primary' : 'secondary'} align="center">
                  {coverNames[c]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label={photo ? 'Change photo' : 'Use a photo'} icon="image-outline" variant="secondary" size="sm" onPress={choosePhoto} />
          {photo ? <Button label="Remove photo" variant="ghost" accent="coral" size="sm" onPress={() => setPhoto(undefined)} /> : null}
        </View>
        <Text variant="caption" tone="tertiary">
          Photos are made smaller and kept on this device. They’re only shared once cloud sharing is switched on, and only with your household.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="callout" tone="secondary">
          Important dates
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button
            label="Add a birthday"
            icon="gift-outline"
            variant="soft"
            accent="sunshine"
            size="sm"
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: 'new', important: '1', title: '’s birthday' } })}
          />
          <Button
            label="Add an anniversary"
            icon="heart-outline"
            variant="soft"
            accent="coral"
            size="sm"
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: 'new', important: '1', title: 'Our anniversary' } })}
          />
        </View>
        <Text variant="caption" tone="tertiary">
          They repeat every year and get a gentle celebration on Home.
        </Text>
      </View>
    </ModalScreen>
  );
}

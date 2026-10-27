import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { ChipRow, DatePicker, Field } from '@/components/forms/Fields';
import { Button, Chip, ModalHeader, ModalScreen, SettingRow, Text, TextField } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { addPhotos } from '@/features/albums/importer';
import { pickPhotos, type PickedPhoto } from '@/features/albums/picker';
import { storageEstimate } from '@/features/albums/storage';
import { useAlbums } from '@/features/albums/store';
import { suggestTemplate, TEMPLATES } from '@/features/albums/templates';
import type { TemplateKey } from '@/features/albums/types';
import { useSpace } from '@/features/space/store';
import { radius, space, useTheme } from '@/theme';

type Chosen = PickedPhoto;

const mb = (bytes: number) => (bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);

/**
 * Make an album: choose photos, give it a name, Create. Oursome designs the
 * pages; everything is editable afterwards, but nothing has to be.
 */
export default function NewAlbum() {
  const params = useLocalSearchParams<{ template?: TemplateKey }>();
  const { palette } = useTheme();
  const people = useSpace((s) => s.people);
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<TemplateKey | null>(params.template ?? null);
  const [person, setPerson] = useState<{ memberId?: string; name: string } | null>(null);
  const [birthDate, setBirthDate] = useState<string | undefined>();
  const [keepOriginals, setKeepOriginals] = useState(true);
  const [space_, setSpace] = useState<{ used: number; quota: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const effective: TemplateKey = template ?? suggestTemplate(title);
  const growing = effective === 'growingUp';
  const size = chosen.reduce((n, c) => n + (c.file?.size ?? 0), 0);

  useEffect(() => {
    void storageEstimate().then(setSpace);
  }, []);

  const pick = async () => {
    if (picking) return;
    try {
      const added = await pickPhotos(() => setPicking(true));
      if (added.length) setChosen((c) => [...c, ...added]);
    } catch (e) {
      toast({ message: `Your photos couldn’t be opened${e instanceof Error && e.message ? ` (${e.message})` : ''}. Please try again.`, tone: 'error' });
    } finally {
      setPicking(false);
    }
  };

  const create = async () => {
    if (!chosen.length || busy) return;
    setBusy(true);
    const store = useAlbums.getState();
    const album = store.createAlbum({
      title: title.trim() || defaultTitle(effective, person?.name),
      template: effective,
      person: growing && person ? { ...person, birthDate } : undefined,
    });
    const skipped = await addPhotos(album.id, chosen, { keepOriginals });
    if (skipped)
      toast({
        message: `${skipped} ${skipped === 1 ? 'photo' : 'photos'} couldn’t be saved. The device may be out of space.`,
        tone: 'error',
      });
    router.replace({ pathname: '/album/[id]', params: { id: album.id, fresh: '1' } });
  };

  const overQuota = !!space_ && space_.quota > 0 && space_.used + size * (keepOriginals ? 1.4 : 0.5) > space_.quota * 0.9;

  return (
    <ModalScreen
      header={
        <ModalHeader
          title="New album"
          action={busy ? 'Creating…' : 'Create album'}
          onAction={create}
          actionDisabled={!chosen.length || busy}
        />
      }>
      {/* Photos */}
      <Pressable
        onPress={pick}
        accessibilityRole="button"
        accessibilityLabel={chosen.length ? `Add more photos. ${chosen.length} chosen` : 'Choose photos'}
        style={({ pressed }) => ({
          borderRadius: radius.xl,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: palette.borderStrong,
          backgroundColor: palette.surface,
          padding: space.xl,
          alignItems: 'center',
          gap: space.sm,
          opacity: pressed ? 0.8 : 1,
        })}>
        {picking ? <ActivityIndicator color={palette.accents.coral.ink} /> : <Icon name="images-outline" size={32} color={palette.accents.coral.ink} />}
        <Text variant="heading">
          {picking ? 'Getting your photos…' : chosen.length ? `${chosen.length} ${chosen.length === 1 ? 'photo' : 'photos'} chosen` : 'Choose photos'}
        </Text>
        <Text variant="callout" tone="secondary" align="center">
          {picking
            ? 'Choose your photos, then tap Add at the top. Lots of photos can take a few seconds.'
            : chosen.length
              ? 'Tap to add more.'
              : 'Pick as many as you like: a day, a holiday, a whole school year.'}
        </Text>
      </Pressable>
      {chosen.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {chosen.slice(0, 40).map((c, i) => (
            <Pressable
              key={i}
              onPress={() => setChosen((x) => x.filter((_, j) => j !== i))}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}>
              <Image source={{ uri: c.preview }} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 8 }} />
            </Pressable>
          ))}
          {chosen.length > 40 ? (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                backgroundColor: palette.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text variant="callout" tone="secondary">
                +{chosen.length - 40}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      <TextField
        label="Album name"
        value={title}
        onChangeText={setTitle}
        placeholder={growing ? 'e.g. Sam growing up' : 'e.g. Cornwall, summer 2026'}
        maxLength={60}
      />

      <Field
        icon="color-palette-outline"
        label={template ? 'Style' : `Style · suggested: ${TEMPLATES.find((t) => t.key === effective)!.name}`}
        accent="coral">
        <ChipRow>
          {TEMPLATES.map((t) => (
            <Chip
              key={t.key}
              label={t.name}
              icon={t.icon}
              small
              accent="coral"
              selected={effective === t.key}
              onPress={() => setTemplate(t.key)}
            />
          ))}
        </ChipRow>
        <Text variant="caption" tone="tertiary">
          {TEMPLATES.find((t) => t.key === effective)!.description}
        </Text>
      </Field>

      {growing ? (
        <Field icon="leaf-outline" label="Whose album is it?" accent="mint">
          <ChipRow>
            {people
              .filter((p) => !p.isMe)
              .map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  small
                  dot={p.color}
                  accent={p.color}
                  selected={person?.memberId === p.id}
                  onPress={() => {
                    setPerson({ memberId: p.id, name: p.name });
                    if (!title) setTitle(`${p.name} growing up`);
                  }}
                />
              ))}
          </ChipRow>
          {!people.some((p) => !p.isMe) ? (
            <TextField
              label="Their name"
              value={person?.name ?? ''}
              onChangeText={(name) => setPerson(name ? { name } : null)}
              placeholder="e.g. Sam"
            />
          ) : null}
          <Text variant="callout" tone="secondary">
            Birthday (for ages on each chapter, optional)
          </Text>
          <DatePicker value={birthDate} onChange={setBirthDate} optional emptyLabel="Skip" accent="mint" />
        </Field>
      ) : null}

      <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, paddingHorizontal: space.md }}>
        <SettingRow
          icon="albums-outline"
          accent="sky"
          label="Keep original files"
          detail={
            keepOriginals
              ? 'Full quality for printing and downloads. Uses more space.'
              : 'Keeps a high-quality copy (2048 px). Saves space.'
          }
          value={keepOriginals}
          onValueChange={setKeepOriginals}
        />
      </View>
      {space_ ? (
        <Text variant="caption" tone={overQuota ? 'danger' : 'tertiary'}>
          {overQuota
            ? `These photos may not fit in the space this browser allows (${mb(space_.used)} of ${mb(space_.quota)} used). Try without originals, or fewer photos.`
            : `Photos are kept on this device only, in this browser’s storage (${mb(space_.used)} of ${mb(space_.quota)} used). They’re never public and never used to train AI.`}
        </Text>
      ) : (
        <Text variant="caption" tone="tertiary">
          Photos are kept on this device only. They’re never public and never used to train AI.
        </Text>
      )}

      <Button
        label={busy ? 'Creating…' : 'Create album'}
        icon="sparkles-outline"
        size="lg"
        fullWidth
        onPress={create}
        disabled={!chosen.length || busy}
      />
    </ModalScreen>
  );
}

function defaultTitle(t: TemplateKey, name?: string): string {
  if (t === 'growingUp') return name ? `${name} growing up` : 'Growing up';
  const year = new Date().getFullYear();
  return {
    holiday: `Holiday ${year}`,
    wedding: 'Our wedding',
    birthday: 'Birthday',
    school: `School year ${year}`,
    milestone: 'A milestone',
    graduation: 'Graduation',
    everyday: 'Everyday moments',
  }[t];
}

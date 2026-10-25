import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { DatePicker, Field } from '@/components/forms/Fields';
import { Button, ModalHeader, ModalScreen, Segmented, Text } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { forgetPhotoLater, useMemories, useMemoryById, type MemoryKind } from '@/features/memories/store';
import { useSpace } from '@/features/space/store';
import { haptic } from '@/lib/haptics';
import { createId } from '@/lib/id';
import { todayKey } from '@/lib/dates';
import { deletePhoto, savePhoto, usePhoto } from '@/lib/photoStore';
import { pickPhoto } from '@/lib/photos';
import { fonts, radius, space, useTheme } from '@/theme';

const kinds: { value: MemoryKind; label: string; icon: 'heart-outline' | 'flag-outline' | 'create-outline' }[] = [
  { value: 'memory', label: 'Memory', icon: 'heart-outline' },
  { value: 'milestone', label: 'Milestone', icon: 'flag-outline' },
  { value: 'note', label: 'Note', icon: 'create-outline' },
];

/** Write a journal page: a moment, a milestone or a note, with an optional photo. */
export default function MemoryEditor() {
  const params = useLocalSearchParams<{ id: string; kind?: MemoryKind }>();
  const { palette } = useTheme();
  const existing = useMemoryById(params.id);
  const hasSpace = useSpace((s) => !!s.space);
  const storedPhoto = usePhoto(existing?.photoId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [date, setDate] = useState(existing?.date ?? todayKey());
  const [kind, setKind] = useState<MemoryKind>(existing?.kind ?? params.kind ?? 'memory');
  const [visibility, setVisibility] = useState(existing?.visibility ?? 'private');
  // undefined: unchanged; null: removed; string: a newly chosen photo.
  const [newPhoto, setNewPhoto] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const photo = newPhoto === undefined ? storedPhoto : newPhoto;

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    let photoId = existing?.photoId;
    try {
      if (newPhoto) {
        photoId = createId('p_');
        await savePhoto(photoId, newPhoto);
      } else if (newPhoto === null) photoId = undefined;
    } catch {
      setSaving(false);
      toast({ message: 'That photo couldn’t be saved. Try a smaller one.', tone: 'error' });
      return;
    }
    if (existing?.photoId && existing.photoId !== photoId) deletePhoto(existing.photoId).catch(() => {});
    const data = {
      title: title.trim(),
      body: body.trim() || undefined,
      date,
      kind,
      photoId,
      visibility: hasSpace ? visibility : ('private' as const),
    };
    if (existing) useMemories.getState().updateMemory(existing.id, data);
    else useMemories.getState().addMemory(data);
    haptic.success();
    toast({ message: existing ? 'Page updated' : 'Added to your journal' });
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const { removeMemory, restoreMemory } = useMemories.getState();
    removeMemory(existing.id);
    forgetPhotoLater(existing.photoId, () => useMemories.getState().memories.some((m) => m.id === existing.id));
    toast({ message: 'Page removed', action: { label: 'Undo', onPress: () => restoreMemory(existing) } });
    router.back();
  };

  const choosePhoto = async () => {
    const uri = await pickPhoto({ maxSize: 1200 });
    if (uri) setNewPhoto(uri);
  };

  return (
    <ModalScreen
      header={
        <ModalHeader
          title={existing ? 'Journal page' : 'New page'}
          action={saving ? 'Saving…' : 'Save'}
          onAction={save}
          actionDisabled={!title.trim() || saving}
        />
      }>
      <Segmented value={kind} onChange={setKind} accent="coral" options={kinds} />

      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus={!existing}
        placeholder={kind === 'milestone' ? 'e.g. First day at school' : kind === 'note' ? 'A note to remember' : 'What happened?'}
        placeholderTextColor={palette.textTertiary}
        accessibilityLabel="Title"
        multiline
        maxLength={120}
        style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: palette.text, paddingVertical: space.sm }}
      />

      <Field icon="calendar-outline" label="Date" accent="sky">
        <DatePicker value={date} onChange={(d) => d && setDate(d)} accent="sky" />
      </Field>

      <Field icon="image-outline" label="Photo" accent="sunshine">
        {photo ? (
          <Image
            source={{ uri: photo }}
            contentFit="cover"
            accessibilityLabel="Chosen photo"
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: palette.surfaceSunken }}
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label={photo ? 'Change photo' : 'Add a photo'} icon="image-outline" variant="secondary" size="sm" onPress={choosePhoto} />
          {photo ? <Button label="Remove photo" variant="ghost" accent="coral" size="sm" onPress={() => setNewPhoto(null)} /> : null}
        </View>
        <Text variant="caption" tone="tertiary">
          Photos are made smaller and kept on this device.
        </Text>
      </Field>

      <Field icon="document-text-outline" label="In your words" accent="lavender">
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="Who was there, what made you laugh…"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="In your words"
          style={{
            minHeight: 140,
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: palette.border,
            padding: space.md,
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: 24,
            color: palette.text,
            textAlignVertical: 'top',
          }}
        />
      </Field>

      {hasSpace ? (
        <Field icon="people-outline" label="Who can see it" accent="sunshine">
          <Segmented
            value={visibility}
            onChange={setVisibility}
            accent="sunshine"
            options={[
              { value: 'private', label: 'Just me', icon: 'lock-closed-outline' },
              { value: 'shared', label: 'My family', icon: 'people-outline' },
            ]}
          />
          <Text variant="caption" tone="tertiary">
            {visibility === 'private' ? 'Only you can see this page.' : 'Everyone in your family can see this page.'}
          </Text>
        </Field>
      ) : null}

      {existing ? (
        <Button label="Remove page" icon="trash-outline" variant="danger" onPress={remove} style={{ alignSelf: 'center' }} />
      ) : null}
    </ModalScreen>
  );
}

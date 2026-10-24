import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { ImportCard, type ProposalStatus } from '@/components/assistant/ImportCard';
import { Illustration } from '@/components/illustrations/Illustration';
import { Button, ModalHeader, ModalScreen, Segmented, Text } from '@/components/ui';
import { applyProposal } from '@/features/assistant/apply';
import { extractFromText } from '@/features/assistant/importer';
import type { Proposal } from '@/features/assistant/parser';
import { useSpace } from '@/features/space/store';
import { haptic } from '@/lib/haptics';
import { fonts, radius, space, useTheme } from '@/theme';

const SAMPLE = 'Sports Day is on Friday at 9 AM. Bring a water bottle, hat and packed lunch.';

export default function ImportScreen() {
  const { palette } = useTheme();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<{ proposal: Proposal; status: ProposalStatus }[] | null>(null);
  const [ambiguous, setAmbiguous] = useState<string[]>([]);

  const analyse = () => {
    const { proposals, ambiguous: amb } = extractFromText(text, { now: new Date(), members: useSpace.getState().space?.members ?? [] });
    setResults(proposals.map((p) => ({ proposal: p, status: 'pending' })));
    setAmbiguous(amb);
  };

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const setStatus = (i: number, status: ProposalStatus) => setResults((r) => r && r.map((x, j) => (j === i ? { ...x, status } : x)));
  const pending = results?.filter((r) => r.status === 'pending') ?? [];

  return (
    <ModalScreen header={<ModalHeader title="Smart import" />}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Illustration name="import" width={170} />
        <Text variant="body" tone="secondary" align="center">
          Turn school notices, confirmations and messages into events, checklists and reminders. You review everything before it’s saved.
        </Text>
      </View>

      <Segmented
        value={mode}
        onChange={setMode}
        accent="lavender"
        options={[
          { value: 'text', label: 'Paste text', icon: 'clipboard-outline' },
          { value: 'image', label: 'Screenshot', icon: 'image-outline' },
        ]}
      />

      {mode === 'text' ? (
        <View style={{ gap: space.md }}>
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setResults(null);
            }}
            multiline
            placeholder={`Paste a message or notice here…\n\ne.g. “${SAMPLE}”`}
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel="Text to import"
            style={{
              minHeight: 150,
              backgroundColor: palette.surface,
              borderRadius: radius.lg,
              padding: space.lg,
              fontFamily: fonts.body,
              fontSize: 16,
              lineHeight: 23,
              color: palette.text,
              textAlignVertical: 'top',
            }}
          />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button label="Find events & tasks" icon="sparkles" accent="lavender" disabled={!text.trim()} onPress={analyse} />
            {!text ? <Button label="Try an example" variant="ghost" accent="lavender" onPress={() => setText(SAMPLE)} /> : null}
          </View>
          <Text variant="caption" tone="tertiary">
            Text is processed on this device and isn’t stored.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={{ width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: palette.surfaceSunken }}
              contentFit="contain"
              accessibilityLabel="Selected screenshot"
            />
          ) : null}
          <Button
            label={image ? 'Choose a different image' : 'Choose a screenshot'}
            icon="images-outline"
            variant="soft"
            accent="lavender"
            onPress={pick}
          />
          <View
            style={{
              flexDirection: 'row',
              gap: space.md,
              backgroundColor: palette.accents.lavender.soft,
              borderRadius: radius.lg,
              padding: space.lg,
            }}>
            <Icon name="time-outline" size={18} color={palette.accents.lavender.ink} style={{ marginTop: 2 }} />
            <Text variant="callout" tone="lavender" style={{ flex: 1 }}>
              Reading screenshots, photos and PDFs uses our secure AI service, coming in a later update. Before it’s switched on, we’ll
              explain exactly how images are processed, and they won’t be kept after reading.
            </Text>
          </View>
        </View>
      )}

      {results ? (
        <View style={{ gap: space.md }}>
          <Text variant="heading">
            {results.length ? `Found ${results.length} ${results.length === 1 ? 'item' : 'items'}` : 'Nothing with a date found'}
          </Text>
          {ambiguous.map((a) => (
            <View key={a} style={{ backgroundColor: palette.accents.sunshine.soft, borderRadius: radius.md, padding: space.md }}>
              <Text variant="callout" tone="sunshine">
                {a} — add this one manually so the date is right.
              </Text>
            </View>
          ))}
          {pending.length > 1 ? (
            <Button
              label={`Add all ${pending.length}`}
              icon="checkmark-done"
              onPress={() => {
                results.forEach((r) => r.status === 'pending' && applyProposal(r.proposal));
                haptic.success();
                setResults(results.map((r) => (r.status === 'pending' ? { ...r, status: 'saved' } : r)));
              }}
            />
          ) : null}
          {results.map((r, i) => (
            <ImportCard
              key={r.proposal.id + i}
              index={i}
              proposal={r.proposal}
              status={r.status}
              onApprove={(p) => {
                applyProposal(p);
                haptic.success();
                setStatus(i, 'saved');
              }}
              onDismiss={() => setStatus(i, 'dismissed')}
            />
          ))}
        </View>
      ) : null}
    </ModalScreen>
  );
}

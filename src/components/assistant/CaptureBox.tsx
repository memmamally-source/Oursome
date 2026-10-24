import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useAssistant } from '@/features/assistant/store';
import { haptic } from '@/lib/haptics';
import { elevation, fonts, radius, space, useTheme } from '@/theme';

import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

import { AssistantReply } from './AssistantReply';

/**
 * The organiser: type anything in everyday words. The latest reply (with
 * review cards) appears right underneath, so ordinary requests never need
 * another screen.
 */
export function CaptureBox({ autoFocus, onSent }: { autoFocus?: boolean; onSent?: () => void }) {
  const { palette } = useTheme();
  const [text, setText] = useState('');
  const send = useAssistant((s) => s.send);
  const busy = useAssistant((s) => s.busy);
  const turns = useAssistant((s) => s.turns);
  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant');
  const lastUser = [...turns].reverse().find((t) => t.role === 'user');

  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    haptic.tap();
    setText('');
    send(value);
    onSent?.();
  };

  return (
    <View style={[{ backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1.5, borderColor: palette.accents.lavender.soft, padding: space.lg, gap: space.md }, elevation(palette, 1)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="sparkles" size={15} color={palette.accents.lavender.ink} />
        <Text variant="overline" tone="lavender">
          Your organiser
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          autoFocus={autoFocus}
          returnKeyType="send"
          blurOnSubmit
          multiline
          placeholder="Add a task, plan or question…"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="Tell Oursome anything"
          accessibilityHint="Type a task, event, reminder or question in your own words"
          style={{ flex: 1, minHeight: 52, maxHeight: 140, fontFamily: fonts.body, fontSize: 18, lineHeight: 25, color: palette.text, paddingVertical: space.sm }}
        />
        <Pressable
          onPress={submit}
          disabled={!text.trim() || busy}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: text.trim() ? palette.accents.coral.base : palette.surfaceSunken,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Icon name="arrow-up" size={22} color={text.trim() ? palette.onAccent : palette.textTertiary} />
        </Pressable>
      </View>

      {lastAssistant && lastUser ? (
        <View style={{ gap: space.md, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.md }}>
          <Text variant="callout" tone="secondary" numberOfLines={2}>
            You: {lastUser.text}
          </Text>
          <AssistantReply turn={lastAssistant} />
          {turns.length > 2 || (lastAssistant.proposalIds?.length ?? 0) > 0 ? (
            <Pressable onPress={() => router.push('/assistant')} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
              <Text variant="callout" tone="lavender" style={{ fontFamily: fonts.bodyBold }}>
                Open conversation →
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

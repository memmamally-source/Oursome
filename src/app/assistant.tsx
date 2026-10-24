import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantReply } from '@/components/assistant/AssistantReply';
import { Text } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { AI_ENDPOINT } from '@/features/assistant/remote';
import { useAssistant } from '@/features/assistant/store';
import { haptic } from '@/lib/haptics';
import { fonts, layout, radius, space, useTheme } from '@/theme';

/** The full conversation with the organiser. Shares its state with the Home capture box. */
export default function AssistantScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prompt?: string; t?: string }>();
  const turns = useAssistant((s) => s.turns);
  const busy = useAssistant((s) => s.busy);
  const send = useAssistant((s) => s.send);
  const reset = useAssistant((s) => s.reset);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const handled = useRef<string | undefined>(undefined);

  // A prompt handed over from elsewhere (e.g. a Home suggestion) is sent once.
  useEffect(() => {
    const key = `${params.prompt}|${params.t}`;
    if (!params.prompt || handled.current === key) return;
    handled.current = key;
    void send(params.prompt);
  }, [params.prompt, params.t, send]);

  const submit = (value = draft) => {
    const text = value.trim();
    if (!text || busy) return;
    haptic.tap();
    setDraft('');
    void send(text);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingTop: insets.top + space.sm,
          paddingBottom: space.sm,
          paddingHorizontal: layout.screenPadding,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-back" size={20} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="subheading" accessibilityRole="header">
            Your organiser
          </Text>
          <Text variant="caption" tone="tertiary">
            {AI_ENDPOINT ? 'Smart assistant · nothing is saved until you approve' : 'Basic mode · nothing is saved until you approve'}
          </Text>
        </View>
        {turns.length ? (
          <Pressable onPress={reset} accessibilityRole="button" hitSlop={8}>
            <Text variant="callout" tone="coral" style={{ fontFamily: fonts.bodyBold }}>
              New chat
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: layout.screenPadding,
          gap: space.lg,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
          flexGrow: 1,
        }}>
        {turns.length === 0 ? (
          <View style={{ gap: space.lg, paddingTop: space.xl }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.accents.lavender.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkles" size={28} color={palette.accents.lavender.ink} />
            </View>
            <Text variant="title">What’s on your mind?</Text>
            <Text variant="body" tone="secondary">
              Tell me about tasks, plans, people or shopping in your own words. Ask what’s coming up. I’ll show you exactly what I’d save first.
            </Text>
            <Text variant="caption" tone="tertiary">
              {AI_ENDPOINT
                ? 'Your message and the names, dates and titles it needs are sent to our AI service (powered by Claude) to understand it. They aren’t used to train models, and nothing changes until you approve.'
                : 'Basic mode works on this device: your messages aren’t sent anywhere.'}
            </Text>
          </View>
        ) : (
          turns.map((t) =>
            t.role === 'user' ? (
              <View
                key={t.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  backgroundColor: palette.accents.coral.soft,
                  borderRadius: radius.lg,
                  borderBottomRightRadius: 6,
                  paddingVertical: space.sm,
                  paddingHorizontal: space.md,
                }}>
                <Text variant="body" color={palette.accents.coral.ink}>
                  {t.text}
                </Text>
              </View>
            ) : (
              <View key={t.id} style={{ alignSelf: 'stretch' }}>
                <AssistantReply turn={t} />
              </View>
            ),
          )
        )}
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: palette.border,
          backgroundColor: palette.surface,
          paddingHorizontal: layout.screenPadding,
          paddingTop: space.sm,
          paddingBottom: Math.max(insets.bottom, space.md),
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => submit()}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
            autoFocus={!params.prompt}
            placeholder="Type a task, plan or question…"
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel="Message your organiser"
            style={{
              flex: 1,
              minHeight: 46,
              maxHeight: 120,
              fontFamily: fonts.body,
              fontSize: 17,
              color: palette.text,
              backgroundColor: palette.surfaceSunken,
              borderRadius: radius.lg,
              paddingHorizontal: space.md,
              paddingVertical: 11,
            }}
          />
          <Pressable
            onPress={() => submit()}
            disabled={!draft.trim() || busy}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? palette.accents.coral.base : palette.surfaceSunken,
            }}>
            <Icon name="arrow-up" size={22} color={draft.trim() ? palette.onAccent : palette.textTertiary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProposalCard, type ProposalStatus } from '@/components/assistant/ProposalCard';
import { Illustration } from '@/components/illustrations/Illustration';
import { IconButton, Pill, Text, useTabBarClearance } from '@/components/ui';
import { answerQuery, applyProposal } from '@/features/assistant/apply';
import { applyClarification, nextClarification, parseCapture, type ClarifyOption, type Proposal } from '@/features/assistant/parser';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { haptic } from '@/lib/haptics';
import { createId } from '@/lib/id';
import { elevation, fonts, layout, radius, space, useTheme } from '@/theme';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string }
  | { id: string; role: 'proposals'; items: { proposal: Proposal; status: ProposalStatus }[] }
  | { id: string; role: 'clarify'; question: string; options: ClarifyOption[]; pending: Proposal[]; answered?: string };

const examples = [
  'Dentist appointment on Tuesday at 3 PM',
  'Remind me to renew my car licence next month',
  'Add eggs, bread and butter to the shopping list',
  'What’s on tomorrow?',
  'Organise my tasks for tomorrow',
  'Remind my partner to pay the electricity bill',
];

export default function AssistantScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const params = useLocalSearchParams<{ prompt?: string; t?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const handled = useRef<string | undefined>(undefined);

  const push = (...m: Message[]) => {
    setMessages((prev) => [...prev, ...m]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    haptic.tap();
    setDraft('');
    const user: Message = { id: createId('m_'), role: 'user', text: value };
    const result = parseCapture(value, {
      now: new Date(),
      members: useSpace.getState().space?.members ?? [],
      listNames: useShopping.getState().lists.map((l) => l.name),
    });
    switch (result.type) {
      case 'proposals':
        push(
          user,
          {
            id: createId('m_'),
            role: 'assistant',
            text: result.proposals.length > 1 ? 'Here’s what I found. Add what you’d like:' : 'Here’s what I’ll add. Check it looks right:',
          },
          { id: createId('m_'), role: 'proposals', items: result.proposals.map((p) => ({ proposal: p, status: 'pending' })) },
        );
        break;
      case 'clarify':
        push(user, { id: createId('m_'), role: 'clarify', question: result.question, options: result.options, pending: result.pending });
        break;
      case 'query':
        push(user, { id: createId('m_'), role: 'assistant', text: answerQuery(result.query) });
        break;
      case 'unsupported':
        push(user, {
          id: createId('m_'),
          role: 'assistant',
          text:
            result.reason === 'generative'
              ? 'Creating lists and plans from scratch is coming with the full AI assistant. For now, try telling me the items: “Add pasta, tomatoes and basil to the shopping list”.'
              : 'I didn’t quite catch that. Try something like “Dentist Tuesday at 3” or “Remind me to call mum tomorrow”.',
        });
    }
  };

  useEffect(() => {
    if (params.prompt && params.t !== handled.current) {
      handled.current = params.t;
      send(params.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.prompt, params.t]);

  const setStatus = (messageId: string, index: number, status: ProposalStatus, proposal?: Proposal) =>
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.role === 'proposals'
          ? { ...m, items: m.items.map((it, i) => (i === index ? { proposal: proposal ?? it.proposal, status } : it)) }
          : m,
      ),
    );

  const approve = (messageId: string, index: number, p: Proposal) => {
    const confirmation = applyProposal(p);
    haptic.success();
    setStatus(messageId, index, 'saved', p);
    push({ id: createId('m_'), role: 'assistant', text: `${confirmation} ✓` });
  };

  const answer = (message: Extract<Message, { role: 'clarify' }>, option: ClarifyOption) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...message, answered: option.label } : m)));
    const resolved = applyClarification(message.pending, option);
    // A numeric-date clarification arrives before its proposals are known; re-run with the date fixed.
    if (!resolved.length) {
      push({ id: createId('m_'), role: 'assistant', text: 'Got it.' });
      return;
    }
    const next = nextClarification(resolved, new Date());
    if (next?.type === 'clarify') {
      push({ id: createId('m_'), role: 'clarify', question: next.question, options: next.options, pending: next.pending });
      return;
    }
    push({ id: createId('m_'), role: 'proposals', items: resolved.map((p) => ({ proposal: p, status: 'pending' })) });
  };

  const edit = (p: Proposal) => {
    const common = { id: 'new', title: p.title, date: p.date ?? '', time: p.time ?? '' };
    if (p.kind === 'event') {
      router.push({
        pathname: '/event/[id]',
        params: { ...common, endTime: p.endTime ?? '', location: p.location ?? '', allDay: p.allDay ? '1' : '' },
      });
    } else {
      router.push({
        pathname: '/task/[id]',
        params: { ...common, categoryId: p.categoryId ?? '', assigneeId: p.assigneeId ?? '', reminder: p.kind === 'reminder' ? '1' : '' },
      });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: layout.screenPadding,
          paddingBottom: clearance + 80,
          gap: space.md,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text variant="overline" tone="lavender">
              Assistant
            </Text>
            <Text variant="title" accessibilityRole="header">
              How can I help?
            </Text>
          </View>
          <IconButton
            icon="scan-outline"
            label="Import a screenshot or document"
            variant="soft"
            accent="lavender"
            onPress={() => router.push('/import')}
          />
        </View>
        <Pill label="On-device preview · full AI assistant coming soon" icon="shield-checkmark-outline" accent="lavender" />

        {messages.length === 0 ? (
          <Animated.View entering={FadeInDown.springify().damping(18)} style={{ alignItems: 'center', gap: space.md, marginTop: space.lg }}>
            <Illustration name="assistant" width={190} />
            <Text variant="heading" align="center">
              Tell me what’s on your mind
            </Text>
            <Text variant="callout" tone="secondary" align="center" style={{ maxWidth: 320 }}>
              Type it the way you’d say it. I’ll turn it into tasks, reminders, events or shopping items — and nothing is saved until you
              say so.
            </Text>
            <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.md }}>
              {examples.map((e, i) => (
                <Animated.View key={e} entering={FadeInDown.delay(100 + i * 50)}>
                  <Pressable
                    onPress={() => send(e)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                      backgroundColor: palette.surface,
                      borderRadius: radius.lg,
                      paddingHorizontal: space.lg,
                      paddingVertical: space.md,
                      opacity: pressed ? 0.7 : 1,
                      borderWidth: 1,
                      borderColor: palette.border,
                    })}>
                    <Ionicons name="sparkles-outline" size={16} color={palette.accents.lavender.ink} />
                    <Text variant="callout" style={{ flex: 1 }}>
                      {e}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={palette.textTertiary} />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : (
          messages.map((m) => {
            if (m.role === 'user') {
              return (
                <Animated.View
                  key={m.id}
                  entering={FadeInUp.springify().damping(18)}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '85%',
                    backgroundColor: palette.accents.coral.base,
                    borderRadius: radius.lg,
                    borderBottomRightRadius: 6,
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                  }}>
                  <Text variant="body" color={palette.onAccent}>
                    {m.text}
                  </Text>
                </Animated.View>
              );
            }
            if (m.role === 'assistant') {
              return (
                <Animated.View
                  key={m.id}
                  entering={FadeInUp.delay(80).springify().damping(18)}
                  style={{ flexDirection: 'row', gap: space.sm, maxWidth: '92%' }}>
                  <AssistantAvatar />
                  <View
                    style={{
                      flexShrink: 1,
                      backgroundColor: palette.accents.lavender.soft,
                      borderRadius: radius.lg,
                      borderTopLeftRadius: 6,
                      paddingHorizontal: space.lg,
                      paddingVertical: space.md,
                    }}>
                    <Text variant="body">{m.text}</Text>
                  </View>
                </Animated.View>
              );
            }
            if (m.role === 'clarify') {
              return (
                <Animated.View key={m.id} entering={FadeInUp.delay(80).springify().damping(18)} style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', gap: space.sm, maxWidth: '92%' }}>
                    <AssistantAvatar />
                    <View
                      style={{
                        flexShrink: 1,
                        backgroundColor: palette.accents.lavender.soft,
                        borderRadius: radius.lg,
                        borderTopLeftRadius: 6,
                        paddingHorizontal: space.lg,
                        paddingVertical: space.md,
                      }}>
                      <Text variant="body">{m.question}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 40 }}>
                    {m.options.map((o) => {
                      const chosen = m.answered === o.label;
                      return (
                        <Pressable
                          key={o.label}
                          disabled={!!m.answered}
                          onPress={() => answer(m, o)}
                          accessibilityRole="button"
                          style={{
                            paddingHorizontal: 14,
                            height: 38,
                            justifyContent: 'center',
                            borderRadius: radius.pill,
                            backgroundColor: chosen ? palette.accents.lavender.base : palette.surface,
                            borderWidth: 1.5,
                            borderColor: chosen ? palette.accents.lavender.base : palette.accents.lavender.soft,
                            opacity: m.answered && !chosen ? 0.45 : 1,
                          }}>
                          <Text
                            variant="callout"
                            color={chosen ? palette.onAccent : palette.accents.lavender.ink}
                            style={{ fontFamily: fonts.bodyBold }}>
                            {o.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>
              );
            }
            return (
              <View key={m.id} style={{ gap: space.md }}>
                {m.items.map((it, i) => (
                  <ProposalCard
                    key={it.proposal.id}
                    index={i}
                    proposal={it.proposal}
                    status={it.status}
                    onApprove={(p) => approve(m.id, i, p)}
                    onDismiss={() => setStatus(m.id, i, 'dismissed')}
                    onEdit={edit}
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: layout.screenPadding,
          right: layout.screenPadding,
          bottom: clearance - space.xxxl + space.md,
          alignItems: 'center',
        }}>
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: space.sm,
              backgroundColor: palette.surface,
              borderRadius: radius.xl,
              paddingLeft: space.lg,
              paddingRight: 6,
              paddingVertical: 6,
              width: '100%',
              maxWidth: layout.maxContentWidth - layout.screenPadding * 2,
              borderWidth: 1.5,
              borderColor: palette.accents.lavender.soft,
            },
            elevation(palette, 2),
          ]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => send(draft)}
            returnKeyType="send"
            multiline
            blurOnSubmit
            placeholder="Ask or tell me anything…"
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel="Message the assistant"
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.text, paddingVertical: 10, maxHeight: 110 }}
          />
          <IconButton icon="arrow-up" label="Send" variant="solid" accent="lavender" size={42} onPress={() => send(draft)} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function AssistantAvatar() {
  const { palette } = useTheme();
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: palette.accents.lavender.base,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name="sparkles" size={16} color={palette.onAccent} />
    </View>
  );
}

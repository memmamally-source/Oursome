import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAssistant, type Turn } from '@/features/assistant/store';
import { fonts, radius, space, useTheme } from '@/theme';

import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

import { ProposalCard } from './ProposalCard';

function ThinkingDots() {
  const { palette } = useTheme();
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x % 3) + 1), 350);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs }} accessibilityLabel="Thinking">
      <Icon name="sparkles" size={16} color={palette.accents.lavender.base} />
      <Text variant="callout" tone="secondary">
        Thinking{'.'.repeat(n)}
      </Text>
    </View>
  );
}

const fallbackNote: Record<string, string> = {
  not_configured: 'Basic mode: the smart assistant isn’t switched on yet.',
  offline: 'Basic mode: you’re offline.',
  rate_limited: 'Basic mode: the smart assistant is busy — try again shortly.',
  unavailable: 'Basic mode: the smart assistant couldn’t be reached.',
  invalid_response: 'Basic mode: the smart assistant’s answer couldn’t be used.',
};

/** One assistant response: answer text, data-backed lines and proposal cards. */
export function AssistantReply({ turn }: { turn: Turn }) {
  const { palette } = useTheme();
  const proposals = useAssistant((s) => s.conversation.proposals);
  if (turn.thinking) return <ThinkingDots />;
  const mine = (turn.proposalIds ?? []).map((id) => proposals.find((p) => p.id === id)).filter((p) => !!p);
  const revised = (turn.revisedIds ?? []).map((id) => proposals.find((p) => p.id === id)).filter((p) => !!p);
  const visible = [...revised, ...mine];

  return (
    <View style={{ gap: space.md }}>
      {revised.length && !turn.text ? (
        <Text variant="body">{revised.length === 1 ? 'Done — here’s the updated version:' : 'Done — updated:'}</Text>
      ) : null}
      {turn.text ? <Text variant="body">{turn.text}</Text> : null}
      {turn.answer ? (
        <View style={{ gap: space.sm }}>
          <Text variant="body">{turn.answer.text}</Text>
          {turn.answer.lines.length ? (
            <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border }}>
              {turn.answer.lines.map((l, i) => (
                <View
                  key={`${l.title}-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: palette.border,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {l.title}
                    </Text>
                    {l.detail ? (
                      <Text variant="caption" tone="secondary">
                        {l.detail}
                      </Text>
                    ) : null}
                  </View>
                  {l.who ? (
                    <Text variant="caption" tone="lavender" style={{ fontFamily: fonts.bodyBold }}>
                      {l.who}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {visible.map((p) => (
        <ProposalCard key={p.id} proposal={p} />
      ))}
      {turn.source === 'basic' && turn.fallback ? (
        <Text variant="caption" tone="tertiary">
          {fallbackNote[turn.fallback] ?? fallbackNote.unavailable}
        </Text>
      ) : null}
    </View>
  );
}

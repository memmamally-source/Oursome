import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Card, ModalHeader, ModalScreen, Text } from '@/components/ui';
import { Brand } from '@/config/brand';
import { plans } from '@/config/plans';
import { radius, space, useTheme } from '@/theme';

/**
 * Plan comparison preview. There is deliberately no purchase button: real
 * subscriptions (RevenueCat, sandbox first) arrive in Stage 6 and nothing
 * here grants Premium access.
 */
export default function PremiumScreen() {
  const { palette } = useTheme();
  return (
    <ModalScreen header={<ModalHeader title={`${Brand.name} Premium`} />}>
      <View
        style={{
          backgroundColor: palette.accents.lavender.soft,
          borderRadius: radius.xxl,
          padding: space.xl,
          gap: space.sm,
          overflow: 'hidden',
        }}>
        <View
          style={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: palette.accents.lavender.base,
            opacity: 0.35,
          }}
        />
        <Ionicons name="diamond" size={28} color={palette.accents.lavender.ink} />
        <Text variant="title">More time for the good stuff</Text>
        <Text variant="body" tone="secondary">
          Premium is shared across your whole household. Coming soon — we’ll let you know when it’s ready.
        </Text>
      </View>

      {plans.map((plan) => (
        <Card key={plan.id} tint={plan.id === 'premium' ? 'coral' : undefined} style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text variant="heading">{plan.name}</Text>
            <Text variant="subheading" tone={plan.id === 'premium' ? 'coral' : 'secondary'}>
              {plan.priceLabel}
            </Text>
          </View>
          {plan.altPriceLabel ? (
            <Text variant="caption" tone="secondary" style={{ marginTop: -space.sm }}>
              {plan.altPriceLabel}
            </Text>
          ) : null}
          {plan.features.map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={plan.id === 'premium' ? palette.accents.coral.ink : palette.accents.mint.ink}
                style={{ marginTop: 2 }}
              />
              <Text variant="callout" style={{ flex: 1 }}>
                {f}
              </Text>
            </View>
          ))}
        </Card>
      ))}
      <Text variant="caption" tone="tertiary" align="center">
        Prices are provisional and shown in USD. Final pricing and local currencies will be confirmed in the App Store and Google Play.
      </Text>
    </ModalScreen>
  );
}

import { View } from 'react-native';

import { OrbIdle } from '@/components/brand/Orb';
import { space } from '@/theme';

import { Illustration, type IllustrationName } from '../illustrations/Illustration';
import { Button } from './primitives';
import { Text } from './Text';

export function EmptyState({
  illustration,
  title,
  body,
  action,
  onAction,
  compact,
}: {
  /** An illustration, or 'orb' for the companion resting with a slow breath. */
  illustration: IllustrationName | 'orb';
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? space.md : space.xxl, gap: space.sm }}>
      {illustration === 'orb' ? (
        <View style={{ paddingVertical: space.md }}>
          <OrbIdle size={compact ? 44 : 56} />
        </View>
      ) : (
        <Illustration name={illustration} width={compact ? 120 : 180} />
      )}
      <Text variant="subheading" align="center" style={{ marginTop: space.sm }}>
        {title}
      </Text>
      {body ? (
        <Text variant="callout" tone="secondary" align="center" style={{ maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <Button label={action} onPress={onAction} variant="soft" size="sm" style={{ marginTop: space.sm, alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}

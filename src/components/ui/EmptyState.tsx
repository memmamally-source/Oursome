import { View } from 'react-native';

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
  illustration: IllustrationName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? space.md : space.xxl, gap: space.sm }}>
      <Illustration name={illustration} width={compact ? 120 : 180} />
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

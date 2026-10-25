import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button, ModalHeader, ModalScreen, Text } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { cloudConfigured, joinFamily, useCloud } from '@/features/cloud';
import { parseCode } from '@/features/cloud/mapping';
import { fonts, radius, space, useTheme } from '@/theme';

/** Join a family someone shared, with the code they sent. */
export default function JoinScreen() {
  const { palette } = useTheme();
  const status = useCloud((s) => s.status);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clean = parseCode(code);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = await joinFamily(clean);
      toast({ message: `Welcome to ${name}` });
      router.replace('/space');
    } catch (e) {
      setError((e as Error).message || 'That code didn’t work. Check it and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScreen header={<ModalHeader title="Join a family" />}>
      {!cloudConfigured ? (
        <Text variant="body" tone="secondary">
          Joining a family needs cloud sharing, which isn’t switched on in this copy of Oursome.
        </Text>
      ) : (
        <>
          <Text variant="body" tone="secondary">
            Enter the code you were sent. It looks like ABCDE-23456 and works for 7 days.
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={14}
            placeholder="ABCDE-23456"
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel="Invite code"
            onSubmitEditing={() => clean.length === 10 && void join()}
            style={{
              backgroundColor: palette.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: error ? palette.danger : palette.border,
              padding: space.lg,
              fontFamily: fonts.display,
              fontSize: 28,
              letterSpacing: 3,
              textAlign: 'center',
              color: palette.text,
            }}
          />
          {error ? (
            <Text variant="callout" color={palette.danger} role="alert">
              {error}
            </Text>
          ) : null}
          {status === 'signed-out' ? (
            <Text variant="callout" tone="secondary">
              Sign in with a cloud account first (Settings → Sign out, then sign in).
            </Text>
          ) : null}
          <View style={{ gap: space.sm }}>
            <Button
              label={busy ? 'Joining…' : 'Join'}
              onPress={join}
              disabled={clean.length !== 10 || busy || status === 'signed-out'}
              fullWidth
            />
            <Text variant="caption" tone="tertiary" align="center">
              You’ll see what the family shares. Your private things stay private.
            </Text>
          </View>
        </>
      )}
    </ModalScreen>
  );
}

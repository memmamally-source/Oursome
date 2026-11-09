import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { LogoMark } from '@/components/brand/Logo';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/config/brand';
import { useCloud } from '@/features/cloud';
import { formatCode, parseCode } from '@/features/cloud/mapping';
import { useSession } from '@/features/session/store';
import { space } from '@/theme';

/**
 * Where an invite link lands (oursome.org/invite?code=…, or oursome://invite?code=…
 * in the app). The code is kept until the person has an account, then they join.
 */
export default function InviteScreen() {
  const { code: raw } = useLocalSearchParams<{ code?: string }>();
  const code = parseCode(raw ?? '');
  const signedIn = useSession((s) => s.signedIn);
  const valid = code.length === 10;

  useEffect(() => {
    if (!valid) return;
    useCloud.getState().setPendingInvite(code);
    if (signedIn) router.replace('/join');
  }, [code, valid, signedIn]);

  const phoneBrowser = Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);
  const android = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.xxl }}>
        <LogoMark size={56} />
        <Text variant="title" accessibilityRole="header">
          You’re invited to a family on Oursome
        </Text>
        {valid ? (
          <Text variant="body" tone="secondary">
            Your invite code is {formatCode(code)}. Create an account (or sign in) and you’ll join straight away. It works for 7 days.
          </Text>
        ) : (
          <Text variant="body" tone="secondary">
            This invite link looks incomplete. Ask for a new one, or enter the code in Our Space → Join with a code.
          </Text>
        )}
        {phoneBrowser && valid ? (
          <>
            <Button label="Open in the Oursome app" icon="open-outline" size="lg" fullWidth onPress={() => Linking.openURL(`oursome://invite?code=${code}`)} />
            <Button
              label={android ? 'Get Oursome on Google Play' : 'Get Oursome on the App Store'}
              icon="download-outline"
              variant="secondary"
              fullWidth
              onPress={() => Linking.openURL(android ? PLAY_STORE_URL : APP_STORE_URL)}
            />
            <Text variant="caption" tone="tertiary">
              Or carry on here in the browser:
            </Text>
          </>
        ) : null}
        {!signedIn && valid ? (
          <>
            <Button label="Create an account" variant={phoneBrowser ? 'secondary' : 'primary'} fullWidth onPress={() => router.replace('/sign-up')} />
            <Button label="I already have an account" variant="ghost" fullWidth onPress={() => router.replace('/sign-in')} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

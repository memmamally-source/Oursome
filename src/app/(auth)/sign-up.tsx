import { Link } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { AuthShell, PreviewNotice } from '@/components/auth/AuthShell';
import { Button, Text, TextField } from '@/components/ui';
import { privacyUrl } from '@/config/brand';
import { auth } from '@/features/session/store';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const result = await auth.signUp({ name, email, password });
    setBusy(false);
    if (!result.ok) return setError(result.error);
  };

  return (
    <AuthShell
      title="Let’s get you set up"
      subtitle="Start on your own. Invite your people whenever you’re ready."
      footer={
        <Link href="/sign-in" replace accessibilityRole="link">
          <Text variant="callout" tone="secondary">
            Already have an account?{' '}
            <Text variant="callout" tone="coral">
              Sign in
            </Text>
          </Text>
        </Link>
      }>
      <TextField
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="Alex"
        autoComplete="name"
        textContentType="givenName"
        icon="person-outline"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        icon="mail-outline"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        icon="lock-closed-outline"
        error={error}
        onSubmitEditing={submit}
      />
      <Button label="Create account" size="lg" fullWidth loading={busy} onPress={submit} />
      <PreviewNotice />
      <Text variant="caption" tone="tertiary" align="center">
        How Oursome looks after your information:{' '}
        <Text variant="caption" tone="coral" accessibilityRole="link" onPress={() => Linking.openURL(privacyUrl)}>
          Privacy policy
        </Text>
      </Text>
    </AuthShell>
  );
}

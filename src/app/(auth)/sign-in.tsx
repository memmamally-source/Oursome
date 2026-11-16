import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthShell, PreviewNotice } from '@/components/auth/AuthShell';
import { Button, Text, TextField } from '@/components/ui';
import { auth, useSession } from '@/features/session/store';

export default function SignIn() {
  const remembered = useSession((s) => s.profile?.email ?? '');
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setInfo(null);
    const result = await auth.signIn({ email, password });
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  const [sending, setSending] = useState(false);
  const reset = async () => {
    if (sending) return;
    setError(null);
    if (!email.trim()) return setInfo('Type your email above first, then tap Forgot password.');
    setSending(true);
    const result = await auth.sendPasswordReset(email);
    setSending(false);
    // Never says whether the email has an account.
    setInfo(
      result.ok
        ? `If there’s an Oursome account for ${email.trim()}, a reset link is on its way. It can take a few minutes; check your junk folder too.`
        : result.error,
    );
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Good to see you again."
      footer={
        <Link href="/sign-up" replace accessibilityRole="link">
          <Text variant="callout" tone="secondary">
            New here?{' '}
            <Text variant="callout" tone="coral">
              Create an account
            </Text>
          </Text>
        </Link>
      }>
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
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        icon="lock-closed-outline"
        error={error}
        onSubmitEditing={submit}
      />
      <Pressable onPress={reset} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-end' }}>
        <Text variant="callout" tone="coral">
          {sending ? 'Sending…' : 'Forgot password?'}
        </Text>
      </Pressable>
      {info ? (
        <Text variant="caption" tone="lavender">
          {info}
        </Text>
      ) : null}
      <Button label="Sign in" size="lg" fullWidth loading={busy} onPress={submit} />
      <PreviewNotice />
    </AuthShell>
  );
}

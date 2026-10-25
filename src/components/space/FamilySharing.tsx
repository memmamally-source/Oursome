import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { confirmAction } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { cloudConfigured, inviteToFamily, leaveFamily, shareFamily, useCloud } from '@/features/cloud';
import { formatCode } from '@/features/cloud/mapping';
import { auth } from '@/features/session/store';
import type { Space } from '@/features/types';
import { format } from '@/lib/dates';
import { radius, space as gap, useTheme } from '@/theme';

async function copyOrShare(text: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    if (navigator.share) return navigator.share({ text }).catch(() => {});
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast({ message: 'Copied' });
      return;
    }
  }
  await Share.share({ message: text });
}

/** Invite people to a family: honest about what works in this copy of Oursome. */
export function FamilySharing({ family, isAdmin }: { family: Space; isAdmin: boolean }) {
  const { palette } = useTheme();
  const status = useCloud((s) => s.status);
  const message = useCloud((s) => s.message);
  const saved = useCloud((s) => s.invites[family.id]);
  const [busy, setBusy] = useState(false);
  const invite = saved && new Date(saved.expiresAt) > new Date() ? saved : undefined;
  const box = { backgroundColor: palette.surface, borderRadius: radius.lg, padding: gap.lg, gap: gap.sm } as const;

  const run = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await work();
      if (done) toast({ message: done });
    } catch (e) {
      toast({ message: (e as Error).message || 'That didn’t work. Please try again.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!cloudConfigured) {
    return (
      <View style={box}>
        <Text variant="subheading">Invite someone</Text>
        <Text variant="callout" tone="secondary">
          Inviting people needs cloud sharing, which isn’t switched on in this copy of Oursome. For now, everything stays on this device.
          You can still add the people you plan for, and give them tasks.
        </Text>
      </View>
    );
  }

  if (status === 'signed-out') {
    return (
      <View style={box}>
        <Text variant="subheading">Share with your family</Text>
        <Text variant="callout" tone="secondary">
          Sign in with a cloud account to invite people. Everything on this device stays as it is.
        </Text>
        <Button
          label="Sign in or create an account"
          size="sm"
          accent="sunshine"
          onPress={() => void auth.signOut().then(() => router.replace('/sign-up'))}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>
    );
  }

  if (!family.cloudId) {
    return (
      <View style={box}>
        <Text variant="subheading">Share {family.name}</Text>
        <Text variant="callout" tone="secondary">
          Things you’ve shared with this family (tasks, events, lists, journal pages and notes) are copied to the cloud so the people you
          invite see them. Private things never leave this device. Photos stay on this device for now.
        </Text>
        <Button
          label={busy ? 'Sharing…' : 'Share this family'}
          icon="cloud-upload-outline"
          size="sm"
          accent="sunshine"
          disabled={busy}
          onPress={() => run(() => shareFamily(family.id), `${family.name} is now shared`)}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>
    );
  }

  const leave = () =>
    confirmAction({
      title: `Stop sharing ${family.name} here?`,
      message: 'You’ll leave the shared family. Everything stays on this device, but changes won’t sync any more.',
      confirmLabel: 'Stop sharing',
      destructive: true,
    }).then((ok) => {
      if (ok) void run(() => leaveFamily(family.id), 'Stopped sharing');
    });

  return (
    <View style={box}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={status === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline'} size={18} color={palette.accents.mint.ink} />
        <Text variant="subheading">
          {status === 'offline' ? 'Shared · offline' : status === 'connecting' ? 'Shared · connecting…' : 'Shared · up to date'}
        </Text>
      </View>
      {message ? (
        <Text variant="caption" tone="secondary">
          {message}
        </Text>
      ) : null}
      {invite ? (
        <View style={{ backgroundColor: palette.surfaceSunken, borderRadius: radius.md, padding: gap.md, gap: 4 }}>
          <Text variant="caption" tone="secondary">
            Invite code · works until {format(new Date(invite.expiresAt), 'EEE d MMM')}
          </Text>
          <Text variant="title" selectable style={{ letterSpacing: 2 }}>
            {formatCode(invite.code)}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap.sm }}>
        {isAdmin ? (
          <Button
            label={invite ? 'New code' : 'Create an invite code'}
            icon="key-outline"
            size="sm"
            accent="sunshine"
            disabled={busy}
            onPress={() => run(() => inviteToFamily(family.id))}
          />
        ) : null}
        {invite ? (
          <Button
            label="Send it"
            icon="share-outline"
            size="sm"
            variant="secondary"
            onPress={() =>
              void copyOrShare(`Join ${family.name} on Oursome with the code ${formatCode(invite.code)}. It works for 7 days.`)
            }
          />
        ) : null}
        <Button label="Stop sharing here" size="sm" variant="ghost" accent="coral" disabled={busy} onPress={leave} />
      </View>
      {isAdmin ? null : (
        <Text variant="caption" tone="tertiary">
          Only the person who shared this family can make invite codes.
        </Text>
      )}
    </View>
  );
}

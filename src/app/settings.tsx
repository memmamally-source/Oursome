import { confirmAction } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { LogoMark } from '@/components/brand/Logo';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { Avatar, Card, Divider, IconButton, Screen, Segmented, SettingRow, Text, TextField } from '@/components/ui';
import { Brand } from '@/config/brand';
import { cloudConfigured } from '@/features/cloud';
import { clearDemoContent, hasDemoContent } from '@/features/demo/seed';
import { deleteAllLocalData, exportData } from '@/features/settings/account';
import { useSettings } from '@/features/settings/store';
import { auth, useSession } from '@/features/session/store';
import { useSpace } from '@/features/space/store';
import { accentKeys, space, useTheme } from '@/theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: space.xxl }}>
      <Text variant="overline" tone="secondary" style={{ marginBottom: space.sm, marginLeft: space.xs }}>
        {title}
      </Text>
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        {children}
      </Card>
    </View>
  );
}

function confirm(title: string, message: string, action: string, run: () => void) {
  confirmAction({ title, message, confirmLabel: action, destructive: true }).then((ok) => ok && run());
}

export default function SettingsScreen() {
  const { palette } = useTheme();
  const profile = useSession((s) => s.profile);
  const updateProfile = useSession((s) => s.updateProfile);
  const settings = useSettings();
  const [name, setName] = useState(profile?.name ?? '');
  const [demo, setDemo] = useState(hasDemoContent());

  const saveName = () => {
    if (!name.trim()) return;
    updateProfile({ name: name.trim() });
    useSpace.getState().syncMe({ name: name.trim(), color: profile?.color ?? 'coral' });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          Settings
        </Text>
      </View>

      {/* Profile */}
      <Card style={{ gap: space.lg, marginBottom: space.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Avatar name={profile?.name ?? 'You'} accent={profile?.color ?? 'coral'} size={60} />
          <View style={{ flex: 1 }}>
            <Text variant="heading">{profile?.name}</Text>
            <Text variant="callout" tone="secondary">
              {profile?.email}
            </Text>
          </View>
        </View>
        <TextField label="Display name" value={name} onChangeText={setName} onBlur={saveName} onSubmitEditing={saveName} />
        <View style={{ gap: space.sm }}>
          <Text variant="callout" tone="secondary">
            Your colour
          </Text>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {accentKeys.map((a) => (
              <Pressable
                key={a}
                onPress={() => {
                  updateProfile({ color: a });
                  useSpace.getState().syncMe({ name: profile?.name ?? 'You', color: a });
                }}
                accessibilityRole="radio"
                aria-selected={profile?.color === a}
                accessibilityLabel={a}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: palette.accents[a].base,
                  borderWidth: 3,
                  borderColor: profile?.color === a ? palette.text : 'transparent',
                }}
              />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="globe-outline" size={15} color={palette.textSecondary} />
          <Text variant="caption" tone="secondary">
            Time zone: {profile?.timeZone.replace(/_/g, ' ')} (from this device)
          </Text>
        </View>
      </Card>

      {/* Premium teaser — no purchase flow until subscriptions are implemented. */}
      <Card
        tint="lavender"
        onPress={() => router.push('/premium')}
        accessibilityLabel={`${Brand.name} Premium`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xxl }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: palette.accents.lavender.base,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="diamond" size={22} color={palette.accents.lavender.on} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{Brand.name} Premium</Text>
          <Text variant="caption" tone="lavender">
            Free plan · See what’s coming
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={palette.accents.lavender.ink} />
      </Card>

      <View style={{ marginBottom: space.xxl }}>
        <Text variant="overline" tone="secondary" style={{ marginBottom: space.sm, marginLeft: space.xs }}>
          Appearance
        </Text>
        <Segmented
          value={settings.theme}
          onChange={settings.setTheme}
          options={[
            { value: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
            { value: 'light', label: 'Light', icon: 'sunny-outline' },
            { value: 'dark', label: 'Dark', icon: 'moon-outline' },
          ]}
        />
      </View>

      <Section title="Motion & celebrations">
        <SettingRow
          icon="leaf-outline"
          accent="mint"
          label="Reduce motion"
          detail="Things appear in place instead of moving. Oursome also follows your device setting."
          value={settings.motion === 'reduced'}
          onValueChange={(v) => settings.setMotion(v ? 'reduced' : 'system')}
        />
        <Divider />
        <SettingRow
          icon="sparkles-outline"
          accent="sunshine"
          label="Celebrations"
          detail="The orb's little bounces and decorations for birthdays and anniversaries."
          value={settings.celebrations}
          onValueChange={settings.setCelebrations}
        />
      </Section>

      <Section title="Home">
        <SettingRow
          icon="calendar-clear-outline"
          accent="sky"
          label="Weekly summary"
          detail="On Sundays and Mondays: what got done, and a glance at the week ahead."
          value={settings.weeklySummary}
          onValueChange={settings.setWeeklySummary}
        />
      </Section>

      <Section title="Notifications">
        <NotificationSettings />
      </Section>

      {/* Only for accounts that loaded sample content before it was retired. */}
      {demo ? (
        <Section title="Sample content">
          <SettingRow
            icon="color-palette-outline"
            accent="sunshine"
            label="Clear sample content"
            detail="Removes the demonstration items. Your own items stay."
            onPress={() => {
              clearDemoContent();
              setDemo(false);
            }}
          />
        </Section>
      ) : null}

      <Section title="Privacy & data">
        <SettingRow
          icon="download-outline"
          accent="sky"
          label="Export my data"
          detail="Everything we store, as a JSON file"
          onPress={() => exportData()}
        />
        <Divider />
        <SettingRow
          icon="shield-checkmark-outline"
          accent="mint"
          label="Where your data lives"
          detail={
            cloudConfigured
              ? 'Private things stay on this device. Families you choose to share sync through Firebase, visible only to their members.'
              : 'Everything stays on this device. Nothing is sent to a server.'
          }
        />
      </Section>

      <Section title="Account">
        <SettingRow icon="log-out-outline" accent="lavender" label="Sign out" onPress={() => auth.signOut()} />
        <Divider />
        <SettingRow
          icon="trash-outline"
          accent="coral"
          label="Delete account and data"
          destructive
          onPress={() =>
            confirm('Delete everything?', 'This permanently removes your account and all data on this device.', 'Delete', () => {
              deleteAllLocalData();
            })
          }
        />
      </Section>

      <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.md }}>
        <LogoMark size={36} />
        <Text variant="callout" tone="secondary">
          {Brand.name} · version {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
        <Text variant="caption" tone="tertiary">
          {Brand.tagline}
        </Text>
      </View>
    </Screen>
  );
}

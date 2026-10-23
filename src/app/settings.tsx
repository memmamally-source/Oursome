import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { LogoMark } from '@/components/brand/Logo';
import { Avatar, Card, Divider, IconButton, Screen, Segmented, SettingRow, Text, TextField } from '@/components/ui';
import { Brand } from '@/config/brand';
import { clearDemoContent, hasDemoContent, loadDemoContent } from '@/features/demo/seed';
import { deleteAllLocalData, exportData } from '@/features/settings/account';
import { dashboardSectionKeys, dashboardSectionLabels, useSettings } from '@/features/settings/store';
import { auth, useSession } from '@/features/session/store';
import { useSpace } from '@/features/space/store';
import { formatTime } from '@/lib/dates';
import { accentKeys, radius, space, useTheme } from '@/theme';

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
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) run();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: run },
  ]);
}

export default function SettingsScreen() {
  const { palette } = useTheme();
  const profile = useSession((s) => s.profile);
  const updateProfile = useSession((s) => s.updateProfile);
  const settings = useSettings();
  const [name, setName] = useState(profile?.name ?? '');
  const [demo, setDemo] = useState(hasDemoContent());
  const n = settings.notifications;

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
                accessibilityState={{ selected: profile?.color === a }}
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
          <Ionicons name="globe-outline" size={15} color={palette.textSecondary} />
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
          <Ionicons name="diamond" size={22} color={palette.onAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{Brand.name} Premium</Text>
          <Text variant="caption" tone="lavender">
            Free plan · See what’s coming
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.accents.lavender.ink} />
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

      <Section title="Home screen">
        {dashboardSectionKeys.map((k, i) => (
          <View key={k}>
            {i ? <Divider /> : null}
            <SettingRow label={dashboardSectionLabels[k]} value={settings.dashboard[k]} onValueChange={() => settings.toggleSection(k)} />
          </View>
        ))}
      </Section>

      <Section title="Notifications">
        <View style={{ backgroundColor: palette.accents.sunshine.soft, borderRadius: radius.md, padding: space.md, marginTop: space.md }}>
          <Text variant="caption" tone="sunshine">
            Your choices are saved now. Notification delivery switches on in the next update, and we’ll ask for permission first.
          </Text>
        </View>
        <SettingRow
          icon="calendar-outline"
          accent="sky"
          label="Appointment reminders"
          value={n.appointments}
          onValueChange={(v) => settings.setNotifications({ appointments: v })}
        />
        <Divider />
        <SettingRow
          icon="alarm-outline"
          accent="coral"
          label="Task deadlines"
          value={n.deadlines}
          onValueChange={(v) => settings.setNotifications({ deadlines: v })}
        />
        <Divider />
        <SettingRow
          icon="person-add-outline"
          accent="sunshine"
          label="Assigned to me"
          value={n.assignments}
          onValueChange={(v) => settings.setNotifications({ assignments: v })}
        />
        <Divider />
        <SettingRow
          icon="home-outline"
          accent="lavender"
          label="Household updates"
          value={n.household}
          onValueChange={(v) => settings.setNotifications({ household: v })}
        />
        <Divider />
        <SettingRow
          icon="sunny-outline"
          accent="sunshine"
          label="Morning briefing"
          detail="A gentle summary of your day"
          value={n.morningBriefing}
          onValueChange={(v) => settings.setNotifications({ morningBriefing: v })}
        />
        <Divider />
        <SettingRow
          icon="moon-outline"
          accent="lavender"
          label="Evening briefing"
          detail="A look at tomorrow"
          value={n.eveningBriefing}
          onValueChange={(v) => settings.setNotifications({ eveningBriefing: v })}
        />
        <Divider />
        <SettingRow
          icon="volume-mute-outline"
          accent="mint"
          label="Quiet hours"
          detail={`${formatTime(n.quietHours.from)} – ${formatTime(n.quietHours.to)}`}
          value={n.quietHours.enabled}
          onValueChange={(v) => settings.setNotifications({ quietHours: { ...n.quietHours, enabled: v } })}
        />
      </Section>

      <Section title="Sample content">
        <SettingRow
          icon="color-palette-outline"
          accent="sunshine"
          label={demo ? 'Clear sample content' : 'Load sample content'}
          detail={demo ? 'Removes all demonstration items. Your own items stay.' : 'Adds example events, tasks and lists to explore.'}
          onPress={() => {
            if (demo) clearDemoContent();
            else loadDemoContent();
            setDemo(!demo);
          }}
        />
      </Section>

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
          detail="This preview keeps everything on this device. Nothing is sent to a server."
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

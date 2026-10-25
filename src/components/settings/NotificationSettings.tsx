import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { TimePicker } from '@/components/forms/Fields';
import { Button, Divider, SettingRow, Text } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useReminders } from '@/features/reminders/engine';
import { useSettings } from '@/features/settings/store';
import { formatTime } from '@/lib/dates';
import { notifyPermission, refreshNotifyPermission, requestNotifyPermission, showSystemNotification, type NotifyPermission } from '@/lib/notify';
import { radius, space, useTheme } from '@/theme';

const phone = Platform.OS !== 'web';

const phoneStatus: Record<NotifyPermission, string> = {
  granted: 'On. Reminders arrive as notifications on this phone, even when Oursome is closed.',
  default: 'Allow notifications to get reminders on this phone, even when Oursome is closed.',
  denied: 'Notifications are off for Oursome. Turn them on in your phone’s Settings → Oursome → Notifications.',
  unsupported: 'Reminders appear inside Oursome while it’s open.',
};

const browserStatus: Record<NotifyPermission, string> = {
  granted: 'On. Reminders pop up while Oursome is open in a tab or installed as an app.',
  default: 'Reminders appear inside Oursome while it’s open. Allow notifications to get them when you’re in another tab or app.',
  denied: 'Notifications are blocked in your browser’s site settings. Reminders still appear inside Oursome while it’s open.',
  unsupported: 'Reminders appear inside Oursome while it’s open. System notifications aren’t available here yet.',
};

/** Real reminder settings: what to be reminded about, quiet hours, and how reminders arrive. */
export function NotificationSettings() {
  const { palette } = useTheme();
  const settings = useSettings();
  const n = settings.notifications;
  const history = useReminders((s) => s.history);
  const [permission, setPermission] = useState<NotifyPermission>(notifyPermission);
  const status = phone ? phoneStatus : browserStatus;
  useEffect(() => {
    void refreshNotifyPermission().then(setPermission);
  }, []);

  const allow = async () => {
    const result = await requestNotifyPermission();
    setPermission(result);
    if (result === 'granted') toast({ message: 'Notifications are on' });
  };

  const test = async () => {
    const ok = await showSystemNotification('Oursome', 'Notifications are working. Reminders will look like this.', '/settings', 'test');
    if (!ok) toast({ message: phone ? 'That notification couldn’t be shown. Check Settings → Oursome → Notifications.' : 'That notification couldn’t be shown. Check your browser’s site settings.', tone: 'error' });
  };

  return (
    <>
      <View
        style={{
          backgroundColor: palette.accents.sunshine.soft,
          borderRadius: radius.md,
          padding: space.md,
          marginTop: space.md,
          gap: space.sm,
        }}>
        <Text variant="caption" tone="sunshine">
          {status[permission]}
        </Text>
        {permission === 'default' ? (
          <Button
            label="Allow notifications"
            icon="notifications-outline"
            size="sm"
            accent="sunshine"
            onPress={allow}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
        {permission === 'granted' ? (
          <Button
            label="Send a test"
            icon="paper-plane-outline"
            size="sm"
            variant="secondary"
            onPress={test}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </View>
      <SettingRow
        icon="calendar-outline"
        accent="sky"
        label="Appointment reminders"
        detail="At the time you choose on each event"
        value={n.appointments}
        onValueChange={(v) => settings.setNotifications({ appointments: v })}
      />
      <Divider />
      <SettingRow
        icon="alarm-outline"
        accent="coral"
        label="Task reminders"
        detail="For tasks with a reminder set"
        value={n.deadlines}
        onValueChange={(v) => settings.setNotifications({ deadlines: v })}
      />
      <Divider />
      <SettingRow
        icon="sunny-outline"
        accent="sunshine"
        label="Morning briefing"
        detail="Your day at a glance, at 8 AM"
        value={n.morningBriefing}
        onValueChange={(v) => settings.setNotifications({ morningBriefing: v })}
      />
      <Divider />
      <SettingRow
        icon="moon-outline"
        accent="lavender"
        label="Evening briefing"
        detail="A look at tomorrow, at 7:30 PM"
        value={n.eveningBriefing}
        onValueChange={(v) => settings.setNotifications({ eveningBriefing: v })}
      />
      <Divider />
      <SettingRow
        icon="volume-mute-outline"
        accent="mint"
        label="Quiet hours"
        detail={
          n.quietHours.enabled ? `${formatTime(n.quietHours.from)} – ${formatTime(n.quietHours.to)}. Reminders wait until they end.` : 'Off'
        }
        value={n.quietHours.enabled}
        onValueChange={(v) => settings.setNotifications({ quietHours: { ...n.quietHours, enabled: v } })}
      />
      {n.quietHours.enabled ? (
        <View style={{ gap: space.sm, paddingBottom: space.md }}>
          <Text variant="caption" tone="secondary">
            From
          </Text>
          <TimePicker
            value={n.quietHours.from}
            onChange={(t) => t && settings.setNotifications({ quietHours: { ...n.quietHours, from: t } })}
            accent="mint"
          />
          <Text variant="caption" tone="secondary">
            Until
          </Text>
          <TimePicker
            value={n.quietHours.to}
            onChange={(t) => t && settings.setNotifications({ quietHours: { ...n.quietHours, to: t } })}
            accent="mint"
          />
        </View>
      ) : null}
      {history.length ? (
        <>
          <Divider />
          <View style={{ paddingVertical: space.md, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
                Recent reminders
              </Text>
              <Button label="Clear" variant="ghost" size="sm" onPress={() => useReminders.getState().clearHistory()} />
            </View>
            {history.slice(0, 5).map((h) => (
              <Text key={h.id + h.at} variant="caption" tone="secondary" numberOfLines={1}>
                {new Date(h.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · {h.title} · {h.body}
              </Text>
            ))}
          </View>
        </>
      ) : null}
      {phone ? null : (
        <Text variant="caption" tone="tertiary" style={{ paddingBottom: space.md }}>
          In the browser, reminders arrive while Oursome is open. The iPhone app sends them even when it’s closed.
        </Text>
      )}
    </>
  );
}

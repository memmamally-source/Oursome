import { Icon } from '@/components/ui/Icon';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import {
  ImportantDates,
  QuickCapture,
  ShoppingStrip,
  SpacePreview,
  StatTile,
  SuggestionCard,
  Timeline,
} from '@/components/home/HomeSections';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Avatar, Card, Celebration, EmptyState, Screen, SectionHeader, Text } from '@/components/ui';
import { useDashboard } from '@/features/dashboard/useDashboard';
import type { Suggestion } from '@/features/dashboard/suggestions';
import { clearDemoContent } from '@/features/demo/seed';
import { useSession } from '@/features/session/store';
import { dashboardSectionKeys, useSettings, type DashboardSection } from '@/features/settings/store';
import { useTasks } from '@/features/tasks/store';
import type { Task } from '@/features/types';
import { useNow } from '@/hooks/useNow';
import { format, greetingFor } from '@/lib/dates';
import { radius, space, useTheme } from '@/theme';

export default function HomeScreen() {
  const now = useNow();
  const { palette } = useTheme();
  const profile = useSession((s) => s.profile);
  const sections = useSettings((s) => s.dashboard);
  const dismiss = useSettings((s) => s.dismissSuggestion);
  const hasDemo = useTasks((s) => s.tasks.some((t) => t.isDemo));
  const d = useDashboard(now);
  const [burst, setBurst] = useState(0);
  const greeting = greetingFor(now);
  const firstName = profile?.name.split(' ')[0];

  const onCompleted = (task: Task) => {
    const remaining = d.priorities.filter((t) => t.id !== task.id).length;
    if (task.priority === 'high' || remaining === 0) setBurst(Date.now());
  };

  const runSuggestion = (s: Suggestion) => {
    const a = s.action;
    dismiss(s.id);
    switch (a.type) {
      case 'open-calendar':
        router.navigate({ pathname: '/calendar', params: { date: a.date } });
        break;
      case 'open-tasks':
        router.navigate('/tasks');
        break;
      case 'plan-tomorrow':
        router.navigate({ pathname: '/assistant', params: { prompt: 'Organise my tasks for tomorrow', t: Date.now().toString() } });
        break;
      case 'move-overdue-to-today':
        a.taskIds.forEach((id) => useTasks.getState().updateTask(id, { due: d.today }));
        break;
      case 'create-task':
        useTasks.getState().addTask({
          title: a.title,
          due: a.due,
          categoryId: 'family',
          priority: 'medium',
          visibility: 'private',
          isReminder: true,
          dueTime: '09:00',
          reminderMinutes: 0,
        });
        break;
    }
  };

  const summary = buildSummary(d.timed.length + d.allDay.length, d.dueToday.length);
  const section = (key: DashboardSection, node: ReactNode) =>
    sections[key] ? (
      <View key={key} style={{ marginBottom: space.xxl }}>
        {node}
      </View>
    ) : null;

  return (
    <Screen tabBar>
      {/* Greeting */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.xl }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="overline" tone="coral">
            {format(now, 'EEEE d MMMM')}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {greeting.text}
            {firstName ? `, ${firstName}` : ''}! {greeting.emoji}
          </Text>
          <Text variant="body" tone="secondary">
            {summary}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
          hitSlop={8}>
          <Avatar name={profile?.name ?? 'You'} accent={profile?.color ?? 'coral'} size={44} />
        </Pressable>
      </View>

      {hasDemo ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: palette.surfaceSunken,
            borderRadius: radius.pill,
            paddingVertical: 8,
            paddingHorizontal: space.md,
            marginBottom: space.xl,
          }}>
          <Icon name="color-palette-outline" size={16} color={palette.textSecondary} />
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            You’re viewing sample content.
          </Text>
          <Pressable onPress={clearDemoContent} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear sample content">
            <Text variant="caption" tone="coral" style={{ fontFamily: 'NunitoSans_700Bold' }}>
              Clear it
            </Text>
          </Pressable>
        </View>
      ) : null}

      {section(
        'overview',
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <StatTile
            icon="calendar"
            accent="sky"
            value={d.todayOcc.length}
            label={d.todayOcc.length === 1 ? 'Event' : 'Events'}
            onPress={() => router.navigate('/calendar')}
          />
          <StatTile
            icon="checkmark-done"
            accent="coral"
            value={d.dueToday.length}
            label={d.dueToday.length === 1 ? 'Task' : 'Tasks'}
            onPress={() => router.navigate('/tasks')}
          />
          <StatTile
            icon="notifications"
            accent="sunshine"
            value={d.reminders.length}
            label={d.reminders.length === 1 ? 'Reminder' : 'Reminders'}
            onPress={() => router.navigate('/tasks')}
          />
          <StatTile icon="people" accent="lavender" value={d.sharedToday} label="Shared" onPress={() => router.navigate('/space')} />
        </View>,
      )}

      {section('capture', <QuickCapture />)}

      {d.suggestion
        ? section(
            'suggestion',
            <SuggestionCard
              suggestion={d.suggestion}
              onAction={() => runSuggestion(d.suggestion!)}
              onDismiss={() => dismiss(d.suggestion!.id)}
            />,
          )
        : null}

      {section(
        'schedule',
        <>
          <SectionHeader title="Today’s schedule" action="Calendar" onAction={() => router.navigate('/calendar')} />
          {d.todayOcc.length ? (
            <Timeline timed={d.timed} allDay={d.allDay} nowTime={d.nowTime} />
          ) : (
            <Card>
              <EmptyState
                compact
                illustration="sun"
                title="A clear day ahead"
                body="Nothing on the calendar today. Add an appointment, or enjoy the space."
                action="Add appointment"
                onAction={() => router.push({ pathname: '/event/[id]', params: { id: 'new' } })}
              />
            </Card>
          )}
        </>,
      )}

      {section(
        'priorities',
        <>
          <SectionHeader title="My priorities" action="All tasks" onAction={() => router.navigate('/tasks')} />
          <View>
            {d.priorities.length ? (
              <View style={{ gap: space.sm }}>
                {d.priorities.map((t) => (
                  <TaskRow key={t.id} task={t} card onCompleted={onCompleted} />
                ))}
              </View>
            ) : (
              <Card tint="mint" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Icon name="happy-outline" size={28} color={palette.accents.mint.ink} />
                <View style={{ flex: 1 }}>
                  <Text variant="subheading">{d.completedToday.length ? 'All caught up!' : 'Nothing urgent today'}</Text>
                  <Text variant="callout" tone="secondary">
                    {d.completedToday.length
                      ? `You finished ${d.completedToday.length} ${d.completedToday.length === 1 ? 'task' : 'tasks'} today. Lovely work.`
                      : 'Add a task when something comes up.'}
                  </Text>
                </View>
              </Card>
            )}
            <Celebration burstKey={burst} />
          </View>
        </>,
      )}

      {section(
        'space',
        <>
          <SectionHeader title="Our Space" />
          <SpacePreview space={d.space} sharedTasks={d.sharedOpen.length} sharedEvents={d.sharedEventsToday.length} />
        </>,
      )}

      {d.listSummaries.length
        ? section(
            'shopping',
            <>
              <SectionHeader title="Shopping lists" />
              <ShoppingStrip lists={d.listSummaries} />
            </>,
          )
        : null}

      {d.upcomingImportant.length
        ? section(
            'dates',
            <>
              <SectionHeader title="Important dates" icon="star" accent="sunshine" />
              <Card>
                <ImportantDates dates={d.upcomingImportant} />
              </Card>
            </>,
          )
        : null}

      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.sm }}>
        <Icon name="options-outline" size={16} color={palette.textTertiary} />
        <Text variant="caption" tone="tertiary">
          Customise your Home
        </Text>
      </Pressable>
    </Screen>
  );
}

function buildSummary(events: number, tasks: number): string {
  if (!events && !tasks) return 'A calm day — perfect for getting ahead.';
  const parts = [];
  if (events) parts.push(`${events} ${events === 1 ? 'thing' : 'things'} on the calendar`);
  if (tasks) parts.push(`${tasks} ${tasks === 1 ? 'task' : 'tasks'} to tick off`);
  return `${parts.join(' and ')}. You’ve got this.`;
}

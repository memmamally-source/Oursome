import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { CaptureBox } from '@/components/assistant/CaptureBox';
import { HomeHeader } from '@/components/home/HomeHeader';
import { ComingUp, ListsRow, PeopleRow, SectionTitle, SuggestionLine, TodayCard } from '@/components/home/HomeSections';
import { Screen, Text } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { useCalendar } from '@/features/calendar/store';
import { useDashboard } from '@/features/dashboard/useDashboard';
import type { Suggestion } from '@/features/dashboard/suggestions';
import { clearDemoContent } from '@/features/demo/seed';
import { plateCounts, todayTasks } from '@/features/people/logic';
import { useSession } from '@/features/session/store';
import { useSettings } from '@/features/settings/store';
import { useTasks } from '@/features/tasks/store';
import { useLayout } from '@/hooks/useLayout';
import { useNow } from '@/hooks/useNow';
import { fonts, radius, space, useTheme } from '@/theme';

/**
 * Home is three things: my day, my organiser and my people. Everything
 * else (lists, dates coming up) sits quietly underneath.
 */
export default function HomeScreen() {
  const now = useNow();
  const { palette } = useTheme();
  const { isWide } = useLayout();
  const profile = useSession((s) => s.profile);
  const dismiss = useSettings((s) => s.dismissSuggestion);
  const tasks = useTasks((s) => s.tasks);
  const calendars = useCalendar((s) => s.calendars);
  const hasDemo = tasks.some((t) => t.isDemo);
  const d = useDashboard(now);
  const people = d.space?.members ?? [];
  const toDo = todayTasks(tasks, d.today);
  const counts = plateCounts(people, tasks, d.todayOcc, calendars, d.today);
  const events = [...d.allDay, ...d.timed];
  const memberForCalendar = (id: string) => calendars.find((c) => c.id === id)?.memberId;

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
        router.push({ pathname: '/assistant', params: { prompt: 'What’s on tomorrow?', t: Date.now().toString() } });
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

  const header = (
    <HomeHeader
      now={now}
      name={profile?.name}
      color={profile?.color}
      events={events.length}
      toDo={toDo.length}
      overdue={toDo.filter((t) => t.due! < d.today).length}
      next={d.next}
      people={people}
      showLogo={!isWide}
    />
  );

  const demoNote = hasDemo ? (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: palette.surfaceSunken,
        borderRadius: radius.pill,
        paddingVertical: 8,
        paddingHorizontal: space.md,
      }}>
      <Icon name="color-palette-outline" size={16} color={palette.textSecondary} />
      <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
        You’re viewing sample content.
      </Text>
      <Pressable onPress={clearDemoContent} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear sample content">
        <Text variant="caption" tone="coral" style={{ fontFamily: fonts.bodyBold }}>
          Clear it
        </Text>
      </Pressable>
    </View>
  ) : null;

  const day = (
    <View>
      <SectionTitle title="My day" action="Calendar" onAction={() => router.navigate('/calendar')} />
      <TodayCard events={events} tasks={toDo} nowTime={d.nowTime} people={people} memberForCalendar={memberForCalendar} />
    </View>
  );

  const suggestion = d.suggestion ? (
    <SuggestionLine suggestion={d.suggestion} onAction={() => runSuggestion(d.suggestion!)} onDismiss={() => dismiss(d.suggestion!.id)} />
  ) : null;

  const peopleSection = (
    <View>
      <SectionTitle title="My people" action={people.length > 1 ? 'Our Space' : undefined} onAction={() => router.navigate('/space')} />
      <PeopleRow people={people} counts={counts} />
    </View>
  );

  const lists = d.listSummaries.length ? (
    <View>
      <SectionTitle title="Lists" />
      <ListsRow lists={d.listSummaries} />
    </View>
  ) : null;

  const coming = d.upcomingImportant.length ? (
    <View>
      <SectionTitle title="Coming up" />
      <ComingUp dates={d.upcomingImportant} />
    </View>
  ) : null;

  if (isWide) {
    return (
      <Screen tabBar wide>
        {header}
        <View style={{ flexDirection: 'row', gap: space.xxl, alignItems: 'flex-start' }}>
          <View style={{ flex: 3, gap: space.xxl }}>
            <CaptureBox />
            {suggestion}
            {day}
          </View>
          <View style={{ flex: 2, gap: space.xxl }}>
            {demoNote}
            {peopleSection}
            {lists}
            {coming}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen tabBar>
      {header}
      <View style={{ gap: space.xxl }}>
        <CaptureBox />
        {demoNote}
        {suggestion}
        {day}
        {peopleSection}
        {lists}
        {coming}
      </View>
    </Screen>
  );
}

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { CaptureBox } from '@/components/assistant/CaptureBox';
import { HomeHeader } from '@/components/home/HomeHeader';
import {
  ComingUp,
  PeopleRow,
  QuickActions,
  RecentActivity,
  SectionTitle,
  ShoppingPreview,
  SuggestionLine,
  TodayCard,
  WeeklyCard,
  GettingStarted,
} from '@/components/home/HomeSections';
import { Screen, Text } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { useActivity } from '@/features/activity/store';
import { useCalendar } from '@/features/calendar/store';
import { useDashboard } from '@/features/dashboard/useDashboard';
import type { Suggestion } from '@/features/dashboard/suggestions';
import { clearDemoContent } from '@/features/demo/seed';
import { upcomingOccasions } from '@/features/home/occasions';
import { START_ID, startSteps } from '@/features/home/start';
import { showsWeekly, weekLines, weekSummary } from '@/features/home/weekly';
import { useMemories } from '@/features/memories/store';
import { plateCounts, todayTasks } from '@/features/people/logic';
import { useSession } from '@/features/session/store';
import { useSettings } from '@/features/settings/store';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import { useLayout } from '@/hooks/useLayout';
import { useNow } from '@/hooks/useNow';
import { addDays, toDateKey } from '@/lib/dates';
import { fonts, radius, space, useTheme } from '@/theme';

/**
 * Home: the household's own space. A warm greeting over their cover, the
 * organiser, today, shopping, people and what's coming up, nothing more.
 */
export default function HomeScreen() {
  const now = useNow();
  const { palette } = useTheme();
  const { isWide } = useLayout();
  const profile = useSession((s) => s.profile);
  const dismiss = useSettings((s) => s.dismissSuggestion);
  const weeklyOn = useSettings((s) => s.weeklySummary);
  const dismissed = useSettings((s) => s.dismissedSuggestions);
  const memories = useMemories((s) => s.memories);
  const tasks = useTasks((s) => s.tasks);
  const calendars = useCalendar((s) => s.calendars);
  const hasDemo = tasks.some((t) => t.isDemo);
  const d = useDashboard(now);
  const people = useSpace((s) => s.people);
  const household = useSpace((s) => s.space);
  const activity = useActivity((s) => s.items);
  const toDo = todayTasks(tasks, d.today);
  const counts = plateCounts(people, tasks, d.todayOcc, calendars, d.today);
  const events = [...d.allDay, ...d.timed];
  const memberForCalendar = (id: string) => calendars.find((c) => c.id === id)?.memberId;
  const occasions = upcomingOccasions(d.upcomingImportant, now);
  const weekAhead = toDateKey(addDays(now, 7));
  const allEvents = useCalendar((s) => s.events);
  const week =
    weeklyOn && showsWeekly(now)
      ? weekSummary(
          tasks,
          allEvents,
          memories.map((m) => m.date),
          now,
        )
      : null;
  const weekly = week && !dismissed.includes(week.id) ? { id: week.id, ...weekLines(week) } : null;
  const upcomingReminders = tasks.filter((t) => !t.completedAt && t.isReminder && t.due && t.due > d.today && t.due <= weekAhead);

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
      today={d.today}
      name={profile?.name}
      color={profile?.color}
      household={household}
      events={events.length}
      toDo={toDo.length}
      overdue={toDo.filter((t) => t.due! < d.today).length}
      next={d.next}
      occasions={occasions}
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

  const steps = startSteps({
    hasHome: !!household,
    people: people.length,
    plans: tasks.length + allEvents.length,
    memories: memories.length,
  });
  const firstSteps =
    !dismissed.includes(START_ID) && steps.some((s) => !s.done) ? <GettingStarted steps={steps} onHide={() => dismiss(START_ID)} /> : null;

  const weeklyCard = weekly ? <WeeklyCard back={weekly.back} ahead={weekly.ahead} onDismiss={() => dismiss(weekly.id)} /> : null;

  const peopleSection = (
    <View>
      <SectionTitle title="My people" action={people.length > 1 ? 'Our Space' : undefined} onAction={() => router.navigate('/space')} />
      <PeopleRow people={people} counts={counts} />
    </View>
  );

  const shopping = d.listSummaries.length ? (
    <View>
      <SectionTitle
        title="Shopping"
        action={d.listSummaries.length > 1 ? 'All lists' : undefined}
        onAction={() => router.navigate({ pathname: '/tasks', params: { view: 'lists' } })}
      />
      <ShoppingPreview lists={d.listSummaries} />
    </View>
  ) : null;

  const coming =
    d.upcomingImportant.length || upcomingReminders.length ? (
      <View>
        <SectionTitle title="Coming up" />
        <ComingUp dates={d.upcomingImportant} reminders={upcomingReminders} />
      </View>
    ) : null;

  const recent = activity.length ? (
    <View>
      <SectionTitle title="Recently at home" />
      <RecentActivity items={activity} people={people} />
    </View>
  ) : null;

  // Sections rise in one after another, briefly, when Home opens.
  const stagger = (nodes: ReactNode[]) =>
    nodes.filter(Boolean).map((n, i) => (
      <Reveal key={i} delay={60 * i}>
        {n}
      </Reveal>
    ));

  if (isWide) {
    return (
      <Screen tabBar wide>
        {header}
        <View style={{ flexDirection: 'row', gap: space.xxl, alignItems: 'flex-start' }}>
          <View style={{ flex: 3, gap: space.xxl }}>
            {stagger([firstSteps, <CaptureBox key="c" />, <QuickActions key="q" />, weeklyCard, suggestion, day])}
          </View>
          <View style={{ flex: 2, gap: space.xxl }}>{stagger([demoNote, peopleSection, shopping, coming, recent])}</View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen tabBar>
      {header}
      <View style={{ gap: space.xxl }}>
        {stagger([
          firstSteps,
          <CaptureBox key="c" />,
          <QuickActions key="q" />,
          demoNote,
          weeklyCard,
          suggestion,
          day,
          shopping,
          peopleSection,
          coming,
          recent,
        ])}
      </View>
    </Screen>
  );
}

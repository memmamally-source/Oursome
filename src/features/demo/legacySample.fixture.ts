/**
 * The sample content older versions put in new accounts (retired in PR #4).
 * Kept only as a test fixture, so the automatic cleanup is tested against
 * exactly what those accounts hold. The app never creates it.
 */
import { PERSONAL_CALENDAR_ID } from '@/features/calendar/store';
import { guessCategory } from '@/features/shopping/logic';
import { ME_ID } from '@/features/space/store';
import type { CalendarEvent, CalendarSource, ShoppingItem, ShoppingList, Space, Task } from '@/features/types';
import { addDays, combine, deviceTimeZone, toDateKey } from '@/lib/dates';

const PARTNER_ID = 'demo_jordan';

export function buildDemo(myName: string, now = new Date()) {
  const day = (offset: number) => toDateKey(addDays(now, offset));
  const tz = deviceTimeZone();
  const created = now.toISOString();
  // Weekday offset helper: next occurrence of a weekday (0=Sun) from today, at least `min` days ahead.
  const nextDow = (dow: number, min = 1) => {
    for (let i = min; i < min + 7; i++) if (addDays(now, i).getDay() === dow) return i;
    return min;
  };

  const calendars: CalendarSource[] = [
    { id: PERSONAL_CALENDAR_ID, name: 'My calendar', color: 'coral', kind: 'personal', visible: true },
    { id: 'demo_cal_jordan', name: 'Jordan', color: 'sky', kind: 'member', memberId: PARTNER_ID, visible: true },
    { id: 'demo_cal_kids', name: 'Kids’ activities', color: 'sunshine', kind: 'shared', visible: true },
    { id: 'demo_cal_home', name: 'Household', color: 'lavender', kind: 'shared', visible: true },
  ];

  const ev = (
    partial: Partial<CalendarEvent> & Pick<CalendarEvent, 'title' | 'calendarId'> & { date: string; from?: string; to?: string },
  ): CalendarEvent => {
    const { date, from = '00:00', to = '23:59', ...rest } = partial;
    return {
      id: `demo_e_${partial.title.toLowerCase().replace(/[^a-z]+/g, '_')}_${date}`,
      start: combine(date, from),
      end: combine(date, to),
      allDay: false,
      timeZone: tz,
      visibility: partial.calendarId === PERSONAL_CALENDAR_ID ? 'private' : 'shared',
      createdAt: created,
      isDemo: true,
      ...rest,
    };
  };

  const events: CalendarEvent[] = [
    ev({
      title: 'School drop-off',
      calendarId: 'demo_cal_home',
      date: day(0),
      from: '08:15',
      to: '08:45',
      recurrence: { freq: 'weekdays' },
      location: 'Maple Grove Elementary',
    }),
    ev({
      title: 'Dentist check-up',
      calendarId: PERSONAL_CALENDAR_ID,
      date: day(0),
      from: '10:00',
      to: '10:45',
      location: 'Bright Smiles Dental',
      reminderMinutes: 60,
      notes: 'Bring insurance card.',
    }),
    ev({ title: 'Lunch with Sam', calendarId: PERSONAL_CALENDAR_ID, date: day(0), from: '12:30', to: '13:30', location: 'Olive & Thyme' }),
    ev({
      title: 'Swim class',
      calendarId: 'demo_cal_kids',
      date: day(0),
      from: '16:00',
      to: '17:00',
      location: 'Riverside Pool',
      recurrence: { freq: 'weekly' },
    }),
    ev({ title: 'Family dinner', calendarId: 'demo_cal_home', date: day(0), from: '18:30', to: '19:30' }),
    ev({
      title: 'Parent–teacher meeting',
      calendarId: 'demo_cal_kids',
      date: day(1),
      from: '09:30',
      to: '10:00',
      location: 'Maple Grove Elementary',
    }),
    ev({ title: 'Jordan — physio', calendarId: 'demo_cal_jordan', date: day(1), from: '11:00', to: '12:00', location: 'Core Physio' }),
    ev({ title: 'Car service', calendarId: PERSONAL_CALENDAR_ID, date: day(1), from: '15:00', to: '16:00', location: 'Northside Auto' }),
    ev({ title: 'Book club', calendarId: PERSONAL_CALENDAR_ID, date: day(3), from: '19:00', to: '21:00', location: 'Priya’s place' }),
    ev({
      title: 'Sports Day',
      calendarId: 'demo_cal_kids',
      date: day(nextDow(5, 2)),
      allDay: true,
      notes: 'Water bottle, hat and packed lunch.',
    }),
    ev({
      title: 'Birthday party — Leo',
      calendarId: 'demo_cal_kids',
      date: day(nextDow(6, 2)),
      from: '14:00',
      to: '16:30',
      location: 'Jump Zone',
    }),
    ev({
      title: 'Grandma’s birthday',
      calendarId: 'demo_cal_home',
      date: day(5),
      allDay: true,
      isImportantDate: true,
      recurrence: { freq: 'yearly' },
    }),
    ev({
      title: 'Our anniversary',
      calendarId: 'demo_cal_home',
      date: day(12),
      allDay: true,
      isImportantDate: true,
      recurrence: { freq: 'yearly' },
    }),
    ev({ title: 'Jordan — work trip', calendarId: 'demo_cal_jordan', date: day(8), from: '07:00', to: '19:00' }),
  ];

  let order = 0;
  const t = (partial: Partial<Task> & Pick<Task, 'title'>): Task => ({
    id: `demo_t_${partial.title.toLowerCase().replace(/[^a-z]+/g, '_')}`,
    categoryId: 'personal',
    priority: 'medium',
    subtasks: [],
    visibility: 'private',
    order: ++order,
    createdAt: created,
    isDemo: true,
    ...partial,
  });

  const tasks: Task[] = [
    t({ title: 'Pay electricity bill', categoryId: 'finance', priority: 'high', due: day(0), notes: 'Due before the 25th.' }),
    t({
      title: 'Sign school permission slip',
      categoryId: 'family',
      priority: 'high',
      due: day(0),
      visibility: 'shared',
      assigneeId: ME_ID,
    }),
    t({ title: 'Return library books', categoryId: 'personal', priority: 'medium', due: day(-1) }),
    t({ title: 'Call the plumber', categoryId: 'home', priority: 'medium', due: day(0), visibility: 'shared', assigneeId: PARTNER_ID }),
    t({ title: 'Pick up dry cleaning', categoryId: 'personal', priority: 'low', due: day(1), dueTime: '17:00' }),
    t({
      title: 'Plan Leo’s birthday gift',
      categoryId: 'family',
      priority: 'medium',
      due: day(3),
      visibility: 'shared',
      subtasks: [
        { id: 'st1', title: 'Ask what he’s into', done: true },
        { id: 'st2', title: 'Order gift', done: false },
        { id: 'st3', title: 'Wrap & card', done: false },
      ],
    }),
    t({ title: 'Water the plants', categoryId: 'home', priority: 'low', due: day(2), recurrence: { freq: 'weekly' } }),
    t({ title: 'Book flu shots', categoryId: 'health', priority: 'medium', due: day(6), visibility: 'shared', assigneeId: PARTNER_ID }),
    t({ title: 'Renew passport', categoryId: 'personal', priority: 'low' }),
    t({
      title: 'Take vitamins',
      categoryId: 'health',
      priority: 'low',
      due: day(0),
      dueTime: '08:00',
      isReminder: true,
      recurrence: { freq: 'daily' },
      reminderMinutes: 0,
    }),
    t({
      title: 'Bins out tonight',
      categoryId: 'home',
      priority: 'medium',
      due: day(0),
      dueTime: '19:30',
      isReminder: true,
      visibility: 'shared',
      recurrence: { freq: 'weekly' },
      reminderMinutes: 0,
    }),
    t({
      title: 'Order school uniform',
      categoryId: 'family',
      priority: 'medium',
      due: day(-1),
      completedAt: addDays(now, -1).toISOString(),
    }),
  ];

  const lists: ShoppingList[] = [
    {
      id: 'demo_l_groceries',
      name: 'Groceries',
      color: 'mint',
      icon: 'basket-outline',
      visibility: 'shared',
      createdAt: created,
      isDemo: true,
    },
    {
      id: 'demo_l_hardware',
      name: 'Hardware store',
      color: 'sky',
      icon: 'construct-outline',
      visibility: 'private',
      createdAt: created,
      isDemo: true,
    },
  ];

  const item = (listId: string, name: string, extra: Partial<ShoppingItem> = {}, i = 0): ShoppingItem => ({
    id: `demo_i_${listId}_${name.toLowerCase().replace(/[^a-z]+/g, '_')}`,
    listId,
    name,
    category: guessCategory(name),
    purchased: false,
    createdAt: new Date(now.getTime() + i).toISOString(),
    ...extra,
  });

  const items: ShoppingItem[] = [
    item('demo_l_groceries', 'Milk', { quantity: '2', addedBy: PARTNER_ID }, 1),
    item('demo_l_groceries', 'Bananas', {}, 2),
    item('demo_l_groceries', 'Sourdough bread', {}, 3),
    item('demo_l_groceries', 'Eggs', { quantity: '12' }, 4),
    item('demo_l_groceries', 'Chicken thighs', { quantity: '1 kg', addedBy: PARTNER_ID }, 5),
    item('demo_l_groceries', 'Pasta', {}, 6),
    item('demo_l_groceries', 'Paper towels', {}, 7),
    item('demo_l_groceries', 'Strawberries', { purchased: true, purchasedAt: created }, 8),
    item('demo_l_hardware', 'Light bulbs', { quantity: '4' }, 9),
    item('demo_l_hardware', 'AA batteries', {}, 10),
    item('demo_l_hardware', 'Picture hooks', {}, 11),
  ];

  const space: Space = {
    id: 'demo_space',
    name: 'Our Home',
    createdAt: created,
    isDemo: true,
    members: [
      { id: ME_ID, name: myName, color: 'coral', role: 'admin', isMe: true },
      { id: PARTNER_ID, name: 'Jordan', color: 'sky', role: 'member', kind: 'person', relationship: 'partner' },
    ],
    announcements: [
      {
        id: 'demo_a1',
        text: 'Plumber is coming Thursday between 2 and 4. Someone needs to be home!',
        authorId: PARTNER_ID,
        createdAt: addDays(now, -1).toISOString(),
        pinned: true,
      },
      { id: 'demo_a2', text: 'Swim kit is in the blue bag by the door.', authorId: ME_ID, createdAt: addDays(now, -2).toISOString() },
    ],
  };

  return { calendars, events, tasks, lists, items, space };
}

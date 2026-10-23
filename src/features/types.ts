import type { IconName } from '@/components/ui/icons.generated';

import type { DateKey, LocalDateTime, TimeKey } from '@/lib/dates';
import type { AccentKey } from '@/theme/tokens';

export type { IconName };

/**
 * Every user item is either private to its owner or shared with an Our Space.
 * Private items never leave the owner's account. In Stage 3 this is enforced
 * by Firestore security rules, not only by client filtering.
 */
export type Visibility = 'private' | 'shared';

export type RecurrenceFreq = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
export type Recurrence = {
  freq: RecurrenceFreq;
  interval?: number;
  /** Inclusive end date. */
  until?: DateKey;
};

export type Priority = 'low' | 'medium' | 'high';

export type Category = {
  id: string;
  name: string;
  color: AccentKey;
  icon: IconName;
  builtIn?: boolean;
};

export type Subtask = { id: string; title: string; done: boolean };

export type Task = {
  id: string;
  title: string;
  notes?: string;
  categoryId: string;
  priority: Priority;
  due?: DateKey;
  dueTime?: TimeKey;
  /** Minutes before the due time (or 9 AM on the due date) to remind. */
  reminderMinutes?: number | null;
  /** Reminder-type items render with a bell and live in the reminders count. */
  isReminder?: boolean;
  recurrence?: Recurrence | null;
  subtasks: Subtask[];
  assigneeId?: string;
  visibility: Visibility;
  order: number;
  createdAt: string;
  completedAt?: string;
  isDemo?: boolean;
};

export type CalendarSource = {
  id: string;
  name: string;
  color: AccentKey;
  kind: 'personal' | 'shared' | 'member' | 'imported';
  memberId?: string;
  visible: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: LocalDateTime;
  end: LocalDateTime;
  allDay: boolean;
  timeZone: string;
  calendarId: string;
  location?: string;
  notes?: string;
  recurrence?: Recurrence | null;
  reminderMinutes?: number | null;
  visibility: Visibility;
  /** Important dates (birthdays, anniversaries) get special treatment on Home. */
  isImportantDate?: boolean;
  createdAt: string;
  isDemo?: boolean;
};

/** A concrete instance of a (possibly recurring) event on a given day. */
export type EventOccurrence = {
  key: string;
  event: CalendarEvent;
  date: DateKey;
  start: LocalDateTime;
  end: LocalDateTime;
};

export type ShoppingCategory =
  | 'produce'
  | 'dairy'
  | 'bakery'
  | 'meat'
  | 'pantry'
  | 'frozen'
  | 'drinks'
  | 'household'
  | 'personal'
  | 'other';

export type ShoppingList = {
  id: string;
  name: string;
  color: AccentKey;
  icon: IconName;
  visibility: Visibility;
  createdAt: string;
  isDemo?: boolean;
};

export type ShoppingItem = {
  id: string;
  listId: string;
  name: string;
  quantity?: string;
  category: ShoppingCategory;
  notes?: string;
  purchased: boolean;
  purchasedAt?: string;
  addedBy?: string;
  createdAt: string;
};

export type MemberRole = 'admin' | 'member';

export type Member = {
  id: string;
  name: string;
  color: AccentKey;
  role: MemberRole;
  isMe?: boolean;
};

export type Announcement = {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  pinned?: boolean;
};

export type Space = {
  id: string;
  name: string;
  members: Member[];
  announcements: Announcement[];
  createdAt: string;
  isDemo?: boolean;
};

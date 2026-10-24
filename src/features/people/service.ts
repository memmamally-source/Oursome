import { useSession } from '@/features/session/store';
import { ME_ID, useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { Member } from '@/features/types';

/** Add a person, making sure the signed-in user is in the space with their real name. */
export function addPerson(input: { name: string; relationship?: string }): Member {
  const profile = useSession.getState().profile;
  const person = useSpace.getState().addPerson(input);
  if (profile) useSpace.getState().syncMe({ name: profile.name, color: profile.color });
  return person;
}

/** Remove a person; their tasks become unassigned rather than disappearing. */
export function removePerson(id: string): void {
  if (id === ME_ID) return;
  const tasks = useTasks.getState();
  for (const t of tasks.tasks) if (t.assigneeId === id) tasks.updateTask(t.id, { assigneeId: undefined });
  useSpace.getState().removePerson(id);
}

/** Give tasks that were suggested for a name (e.g. "Rufaida") to the matching new person. */
export function claimSuggestedTasks(person: Member): number {
  const tasks = useTasks.getState();
  const name = person.name.trim().toLowerCase();
  let n = 0;
  for (const t of tasks.tasks) {
    if (!t.assigneeId && t.assigneeName?.trim().toLowerCase() === name) {
      tasks.updateTask(t.id, { assigneeId: person.id, assigneeName: undefined, visibility: 'shared' });
      n++;
    }
  }
  return n;
}

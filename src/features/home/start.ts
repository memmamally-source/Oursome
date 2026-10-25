import type { IconName } from '@/features/types';

/**
 * First steps for a new household, shown on Home until they're done or
 * hidden. Each step opens the screen where it happens; nothing is forced.
 */
export type StartStep = { key: string; label: string; icon: IconName; done: boolean; href: string };

export function startSteps(state: { hasHome: boolean; people: number; plans: number; memories: number }): StartStep[] {
  return [
    { key: 'home', label: 'Name your home and choose a cover', icon: 'home-outline', done: state.hasHome, href: '/household' },
    {
      key: 'people',
      label: 'Add the people you live with',
      icon: 'people-outline',
      done: state.people > 1,
      href: state.hasHome ? '/person/new' : '/space-create',
    },
    { key: 'plan', label: 'Add a first task or plan', icon: 'add-circle-outline', done: state.plans > 0, href: '/quick-add' },
    { key: 'memory', label: 'Write the first journal page', icon: 'book-outline', done: state.memories > 0, href: '/memory/new' },
  ];
}

export const START_ID = 'getting-started';

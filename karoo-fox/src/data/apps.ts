/**
 * The Karoo Fox app portfolio. Every fact here was checked against the app's
 * own repository, website and published privacy policy on `verifiedOn`.
 * Re-check before changing a status: never mark a store listing "available"
 * unless the listing is live, and never describe planned features as built.
 *
 * Adding an app: add an entry, put a 256×256 icon at
 * public/images/apps/<slug>.webp, then `npm run check`. Pages, support,
 * privacy and data-deletion URLs are generated from this list.
 */

export type Platform = 'web' | 'ios' | 'android';

/**
 * available       – public and live for anyone
 * preview         – public early version (web) that is still being built
 * in-review       – submitted to the store, not yet approved
 * testing         – closed or TestFlight testing, not publicly available
 * planned         – intended but not yet built or submitted
 * unconfirmed     – status not verified; hidden from the public site and reported by `npm run readiness`
 */
export type ReleaseStatus = 'available' | 'preview' | 'in-review' | 'testing' | 'planned' | 'unconfirmed';

export interface Release {
  platform: Platform;
  status: ReleaseStatus;
  /** Public URL (store listing or web app). Only for `available` / `preview`. */
  url?: string;
  note?: string;
}

export interface Fact {
  label: string;
  value: string;
}

export interface App {
  slug: string;
  name: string;
  /** True while the product name is still subject to trademark/store clearance. */
  provisionalName?: boolean;
  category: string;
  tagline: string;
  summary: string;
  description: string[];
  features: string[];
  audience: string;
  /** Overall stage shown on cards. */
  stage: 'available' | 'preview' | 'in-development' | 'planned';
  releases: Release[];
  website?: string;
  /** The app's own published policy (authoritative until hosted here). Absent for unreleased apps. */
  privacyPolicyUrl?: string;
  privacyPolicyDate?: string;
  /** The app's own support page, if it has one. */
  supportPageUrl?: string;
  /** App-specific support mailbox. Falls back to the company support email when absent. */
  supportEmail?: string;
  termsUrl?: string;
  /** Plain-language summary of the published policy. The full policy prevails. */
  privacyInBrief: Fact[];
  /** Whether users can create an account (drives the data-deletion page). */
  hasAccounts: boolean;
  deletionSteps: string[];
  /** Days within which emailed deletion requests are completed, if the policy states it. */
  deletionByEmailDays?: number;
  faqs: { q: string; a: string }[];
  disclaimer?: string;
  /** Brand accent used on the app's card and page header. */
  accent: string;
  verifiedOn: string;
}

export const apps: App[] = [
  {
    slug: 'crossword-hub',
    name: 'Crossword Hub',
    category: 'Games & puzzles',
    tagline: 'Daily crosswords, arcade word games and puzzles to play with friends.',
    summary:
      'A crossword and word-puzzle platform with a daily crossword that gets harder through the week, a daily mini, a weekly challenge and arcade modes.',
    description: [
      'Crossword Hub brings the feel of a classic newspaper crossword to the web and iPhone. A new Daily puzzle arrives every day and gets harder as the week goes on, alongside a six-clue Daily Mini and a weekly Brutal Challenge.',
      'Beyond the dailies there is an archive, a wide range of genres at five difficulty levels, themed collections and an Arcade with fast word games. You can play without an account; signing in keeps your progress across devices.',
    ],
    features: [
      'Daily crossword that builds in difficulty through the week',
      'Daily Mini and a weekly Brutal Challenge',
      'Puzzle archive, genres at five levels and themed collections',
      'Arcade modes: Clue Blitz, Survival and Word Ladder',
      'Live co-op rooms to solve together',
      'Pencil, check and reveal tools, streaks and statistics',
      'Installable on the web and playable offline',
    ],
    audience: 'Puzzle lovers of all levels (general audience; not directed at children under 13).',
    stage: 'available',
    releases: [
      { platform: 'web', status: 'available', url: 'https://crosswordhub.app' },
      { platform: 'ios', status: 'available', url: 'https://apps.apple.com/app/id6825187540' },
      { platform: 'android', status: 'planned' },
    ],
    website: 'https://crosswordhub.app',
    privacyPolicyUrl: 'https://crosswordhub.app/privacy/',
    privacyPolicyDate: '2026-10-20',
    supportPageUrl: 'https://crosswordhub.app/support/',
    supportEmail: 'crosswordhub@gmail.com',
    privacyInBrief: [
      { label: 'Account', value: 'Optional. Play without one; progress then stays on your device.' },
      { label: 'With an account', value: 'Your email address, progress and game records are stored with Google Firebase.' },
      { label: 'Analytics', value: 'Optional and off unless you agree (Google Analytics, with advertising features off).' },
      { label: 'Advertising', value: 'None. No selling of data and no cross-app tracking.' },
    ],
    hasAccounts: true,
    deletionSteps: ['Open Crossword Hub and sign in.', 'Go to Account → Delete account and confirm.'],
    faqs: [
      { q: 'Do I need an account to play?', a: 'No. You can play without one; your progress is then kept on your device only.' },
      { q: 'Is Crossword Hub on Android?', a: 'Not yet. An Android app is planned; in the meantime you can play in any browser at crosswordhub.app.' },
      { q: 'Are there adverts?', a: 'No. Crossword Hub has no advertising.' },
    ],
    accent: '#2E5E3E',
    verifiedOn: '2026-11-16',
  },
  {
    slug: 'oursome',
    name: 'Oursome',
    provisionalName: true,
    category: 'Family & home',
    tagline: 'A calm organiser for couples and families.',
    summary:
      'A household and family organiser for calendars, tasks, reminders, shopping lists, a shared journal and photo albums.',
    description: [
      'Oursome helps couples and families keep everyday life in one place: a shared calendar with views by person, tasks and reminders, shopping lists, a family journal and photo albums.',
      'Your private plans and all your photos stay on your device. If you choose to share with your family, only the items you share are synced through your account.',
    ],
    features: [
      'Calendar with day, three-day and month views, coloured by person',
      'Tasks, reminders and shopping lists',
      'Family journal, milestones and photo albums',
      'Calendar import and export (.ics)',
      'Optional family sharing by invite link',
    ],
    audience: 'Adults, couples and families.',
    stage: 'available',
    releases: [
      { platform: 'web', status: 'available', url: 'https://oursome.org' },
      { platform: 'ios', status: 'available', url: 'https://apps.apple.com/app/id6826843084' },
      { platform: 'android', status: 'testing', note: 'Android app in closed testing' },
    ],
    website: 'https://oursome.org',
    privacyPolicyUrl: 'https://oursome.org/privacy/',
    privacyPolicyDate: '2026-11-09',
    supportPageUrl: 'https://oursome.org/support/',
    supportEmail: 'oursomeapp@outlook.com',
    privacyInBrief: [
      { label: 'On your device', value: 'Plans, lists and all photos stay on your phone or browser.' },
      { label: 'Account', value: 'Optional, only for family sharing (email sign-in with Google Firebase).' },
      { label: 'What is shared', value: 'Only the items you choose to share with your family.' },
      { label: 'Advertising and tracking', value: 'None. Data is not sold, and photos are never used to train AI.' },
    ],
    hasAccounts: true,
    deletionSteps: ['Open Oursome.', 'Go to Settings → Account → Delete account and data, and confirm.'],
    faqs: [
      { q: 'Where can I get Oursome?', a: 'Oursome is on the App Store for iPhone and on the web at oursome.org. The Android app is in testing.' },
      { q: 'Do I need an account?', a: 'No. An account is only needed if you want to share with your family.' },
    ],
    accent: '#B95F49',
    verifiedOn: '2026-11-16',
  },
  {
    slug: 'research-tracker',
    name: 'Research Tracker',
    category: 'Productivity & research',
    tagline: 'Track research projects from idea to submission.',
    summary:
      'An academic research and project-management app that helps researchers and teams see what is due, who owns it and where every paper stands.',
    description: [
      'Research Tracker gives researchers one view of every project: what is overdue or due soon, a 30-day timeline, a calendar and a pipeline of papers by stage, from idea to submission and revision.',
      'Projects hold tasks with owners and dates, team roles, target journals and revision deadlines, and can be shared with co-authors by email invitation.',
    ],
    features: [
      'Dashboard of overdue and upcoming work, timeline and calendar',
      'Board by stage, covering study types from meta-analyses to RCTs',
      'Tasks with owners and due dates, team roles and target journals',
      'Share a project with co-authors by email invitation',
      'One-off or repeating meetings you can add to your calendar',
      'Export and import backups',
    ],
    audience: 'Academic researchers, research students and their teams (not directed at children under 13).',
    stage: 'available',
    releases: [
      { platform: 'web', status: 'available', url: 'https://memmamally-source.github.io/First-project/' },
      // On the App Store (confirmed by the owner, 16 Nov 2026). Add its listing URL when known.
      { platform: 'ios', status: 'available' },
    ],
    privacyPolicyUrl: 'https://memmamally-source.github.io/First-project/privacy/',
    privacyPolicyDate: '2026-10-24',
    supportPageUrl: 'https://memmamally-source.github.io/First-project/support/',
    supportEmail: 'researchprojecttracker@gmail.com',
    privacyInBrief: [
      { label: 'Account', value: 'Required: email and password, stored with Supabase.' },
      { label: 'Your projects', value: 'Stored in the cloud and visible only to you and people you share them with.' },
      { label: 'Analytics, advertising and tracking', value: 'None.' },
    ],
    hasAccounts: true,
    deletionSteps: ['Open Research Tracker and sign in.', 'Open the menu and choose Delete account, then confirm.'],
    faqs: [
      { q: 'What happens to shared projects when I delete my account?', a: 'Projects you own are deleted for everyone you shared them with. Export a backup first if you need one.' },
    ],
    accent: '#1E3A66',
    verifiedOn: '2026-11-16',
  },
  {
    slug: 'stephd',
    name: 'StePhD',
    category: 'Education',
    tagline: 'Game-based study for the USMLE.',
    summary:
      'An interactive medical-education platform for USMLE preparation, starting with Step 1, using question-based learning and game-like study modes.',
    description: [
      'StePhD turns USMLE Step 1 revision into short, game-like sessions: a Daily Mixed set, a Daily Mini and study games, with streaks, progress and study-time tracking.',
      'The current release is a preview with the daily modes free to use. Further game modes, full Step 1 access, Step 2 CK and Step 3 are planned.',
    ],
    features: [
      'Daily Mixed and Daily Mini question sets',
      'Game-like study modes',
      'Streaks, progress and study-time tracking',
      'Optional sign-in to sync progress across devices',
    ],
    audience: 'Medical students preparing for the USMLE (not directed at children under 13).',
    stage: 'preview',
    releases: [
      { platform: 'web', status: 'preview', url: 'https://stephd.app' },
      { platform: 'ios', status: 'in-review', note: 'iPhone app submitted to Apple for review' },
      { platform: 'android', status: 'testing', note: 'Android app in closed testing' },
    ],
    website: 'https://stephd.app',
    privacyPolicyUrl: 'https://stephd.app/privacy/',
    privacyPolicyDate: '2026-11-11',
    supportPageUrl: 'https://stephd.app/support/',
    supportEmail: 'stephd.app@outlook.com',
    termsUrl: 'https://stephd.app/terms/',
    privacyInBrief: [
      { label: 'Without an account', value: 'Nothing is sent from your device.' },
      { label: 'With an account', value: 'Optional sign-in with Apple or Google (Google Firebase) to sync your progress.' },
      { label: 'Advertising and tracking', value: 'None. Data is not sold.' },
    ],
    hasAccounts: true,
    deletionSteps: ['Open StePhD and sign in.', 'Go to Profile → Delete account and confirm.'],
    deletionByEmailDays: 30,
    faqs: [
      { q: 'Is StePhD available in the app stores?', a: 'Not yet. The iPhone app is in Apple’s review and the Android app is in closed testing.' },
      { q: 'Which exams does it cover?', a: 'USMLE Step 1 today. Step 2 CK and Step 3 are planned.' },
    ],
    disclaimer:
      'StePhD is for educational purposes only and is not medical advice. It is not affiliated with or endorsed by the USMLE, the FSMB or the NBME.',
    accent: '#1D63D8',
    verifiedOn: '2026-11-16',
  },
];

export const platformLabel: Record<Platform, string> = { web: 'Web', ios: 'iPhone', android: 'Android' };

export const statusLabel: Record<ReleaseStatus, string> = {
  available: 'Available',
  preview: 'Preview',
  'in-review': 'In review',
  testing: 'In testing',
  planned: 'Planned',
  unconfirmed: 'Unconfirmed',
};

export const stageLabel: Record<App['stage'], string> = {
  available: 'Available now',
  preview: 'Early access',
  'in-development': 'In development',
  planned: 'Planned',
};

/** Releases safe to show publicly (unverified ones are hidden). */
export function publicReleases(app: Pick<App, 'releases'>): Release[] {
  return app.releases.filter((r) => r.status !== 'unconfirmed');
}

/** Store button label, only for live store listings. */
export function storeLink(r: Release): { label: string; url: string } | null {
  if (r.status !== 'available' || !r.url) return null;
  if (r.platform === 'ios') return { label: 'Download on the App Store', url: r.url };
  if (r.platform === 'android') return { label: 'Get it on Google Play', url: r.url };
  return null;
}

export function getApp(slug: string): App {
  const app = apps.find((a) => a.slug === slug);
  if (!app) throw new Error(`Unknown app: ${slug}`);
  return app;
}

/** Problems that would make an app entry unsafe to publish. Used by tests. */
export function validateApp(app: App): string[] {
  const problems: string[] = [];
  if (!/^[a-z0-9-]+$/.test(app.slug)) problems.push('slug must be lowercase letters, digits and hyphens');
  for (const r of app.releases) {
    if (r.platform === 'web' && (r.status === 'available' || r.status === 'preview') && !r.url) problems.push(`web: ${r.status} needs a url`);
    if (r.url && r.status !== 'available' && r.status !== 'preview') problems.push(`${r.platform}: only available/preview releases may link out`);
    if (r.url && !r.url.startsWith('https://')) problems.push(`${r.platform}: url must be https`);
  }
  const released = app.releases.some((r) => r.status === 'available' || r.status === 'preview');
  if (released && !app.privacyPolicyUrl) problems.push('released apps need a privacy policy url');
  if (app.privacyPolicyUrl && !app.privacyPolicyUrl.startsWith('https://')) problems.push('privacy policy url must be https');
  if (app.stage === 'planned' && released) problems.push('planned apps must not have live releases');
  if (app.hasAccounts && app.deletionSteps.length === 0) problems.push('apps with accounts need deletion steps');
  if (app.stage === 'available' && !app.releases.some((r) => r.status === 'available')) problems.push('stage "available" needs at least one available release');
  return problems;
}

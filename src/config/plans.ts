/**
 * Freemium configuration. DISPLAY ONLY: there is no billing yet, and real entitlements must be
 * verified server-side (store receipts) before anything is locked. Explanations are never paywalled.
 */
export interface Plan {
  id: 'free' | 'step1_premium' | 'step2ck_premium' | 'step3_premium' | 'all_steps';
  title: string;
  includes: string[];
}

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    title: 'Free',
    includes: [
      'Daily Medical Mini, Daily Connections and Daily Mystery Patient',
      'Limited Arcade play',
      'Study-time tracking and basic weak-area analysis',
      'Every explanation and Teach Me This lesson',
      'My Mistakes review',
    ],
  },
  {
    id: 'step1_premium',
    title: 'Step 1 Premium',
    includes: ['Unlimited games and subject practice', 'Advanced analytics and adaptive revision', 'Full study plans and history'],
  },
];

/** Billing is not wired. Keep false until store purchase flows and server receipt checks exist. */
export const BILLING_ENABLED = false;

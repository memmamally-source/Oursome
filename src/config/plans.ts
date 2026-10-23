/**
 * Plan definitions and limits — configurable in one place.
 * Display-only in Stage 1. Entitlements will be verified server-side
 * (RevenueCat + Cloud Functions) in Stage 6; never gate features on these
 * values alone on the client.
 */
export type PlanId = 'free' | 'premium';

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  altPriceLabel?: string;
  features: string[];
  limits: {
    aiRequestsPerDay: number;
    importsPerMonth: number;
    spaceMembers: number;
  };
};

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceLabel: '$0',
    features: [
      'Personal calendar, tasks and reminders',
      'Shopping lists',
      'Share with up to 2 people',
      'A taste of the AI assistant and imports',
      'Your daily dashboard',
    ],
    limits: { aiRequestsPerDay: 5, importsPerMonth: 3, spaceMembers: 2 },
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLabel: '$7.99/mo',
    altPriceLabel: 'or $59.99/year — about 37% less',
    features: [
      'Ad-free, always',
      'Much higher AI assistant limits',
      'Advanced screenshot and document imports',
      'Bigger households and advanced sharing',
      'Smart scheduling and advanced routines',
      'Premium themes and customisation',
      'One subscription covers your whole household',
    ],
    limits: { aiRequestsPerDay: 100, importsPerMonth: 100, spaceMembers: 8 },
  },
];

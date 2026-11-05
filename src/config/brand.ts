/** Every user-facing product-name string comes from here, so the name can change in one place. */
export const Brand = {
  name: 'Steps Ahead',
  shortName: 'Steps Ahead',
  tagline: 'Play. Learn. Stay a step ahead.',
  description: 'Games that build real USMLE knowledge, with study tracking, spaced review and weak-area analysis.',
  /** Storage namespace. Changing it starts every user with empty local progress. */
  storageKey: 'steps-ahead',
} as const;

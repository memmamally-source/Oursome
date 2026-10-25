/**
 * Security rules and cloud sync tests. They run against the local Firebase
 * emulators (no real project, nothing deployed): `npm run test:cloud`.
 */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firebase/tests/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testTimeout: 20000,
};

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apps, publicReleases, storeLink, validateApp, type App } from '../../src/data/apps.ts';

test('every app entry is publishable', () => {
  for (const app of apps) assert.deepEqual(validateApp(app), [], app.slug);
});

test('slugs are unique (they form stable store URLs)', () => {
  const slugs = apps.map((a) => a.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('unconfirmed releases are never shown publicly', () => {
  const app = { releases: [{ platform: 'ios', status: 'unconfirmed' }, { platform: 'web', status: 'available', url: 'https://x.test' }] } as Pick<App, 'releases'>;
  assert.deepEqual(publicReleases(app).map((r) => r.platform), ['web']);
});

test('store buttons appear only for live store listings', () => {
  assert.equal(storeLink({ platform: 'ios', status: 'testing' }), null);
  assert.equal(storeLink({ platform: 'ios', status: 'in-review', url: 'https://apps.apple.com/app/id1' }), null);
  assert.equal(storeLink({ platform: 'ios', status: 'available', url: 'https://apps.apple.com/app/id1' })?.label, 'Download on the App Store');
  assert.equal(storeLink({ platform: 'web', status: 'available', url: 'https://x.test' }), null);
});

test('validateApp rejects store links on unreleased platforms', () => {
  const bad: App = { ...apps[0]!, releases: [{ platform: 'android', status: 'testing', url: 'https://play.google.com/x' }], stage: 'preview' };
  assert.ok(validateApp(bad).some((p) => p.includes('only available/preview')));
});

test('planned apps cannot show a live release, and released apps need a privacy policy', () => {
  const planned: App = { ...apps[0]!, stage: 'planned', releases: [{ platform: 'web', status: 'available', url: 'https://x.test' }] };
  assert.ok(validateApp(planned).some((p) => p.includes('planned apps must not have live releases')));
  const { privacyPolicyUrl: _omit, ...noPolicy } = apps[0]!;
  assert.ok(validateApp(noPolicy as App).some((p) => p.includes('need a privacy policy')));
});


test('App Store statuses confirmed by the owner (16 Nov 2026)', () => {
  const ios = (slug: string) => apps.find((a) => a.slug === slug)!.releases.find((r) => r.platform === 'ios')!;
  assert.equal(ios('crossword-hub').status, 'available');
  assert.equal(ios('oursome').status, 'available');
  assert.equal(ios('research-tracker').status, 'available');
  assert.ok(!apps.some((a) => /photo|picture|album|scrapbook/i.test(a.slug + a.name)), 'the album app is not on the site');
});

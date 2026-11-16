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

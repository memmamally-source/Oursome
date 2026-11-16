import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appPaths, formatDate, href } from '../../src/lib/url.ts';

test('href respects the base path', () => {
  assert.equal(href('/apps/', '/'), '/apps/');
  assert.equal(href('/apps/', '/karoo-fox/'), '/karoo-fox/apps/');
  assert.equal(href('apps/', '/karoo-fox'), '/karoo-fox/apps/');
});

test('app URLs are stable', () => {
  assert.deepEqual(appPaths('oursome'), {
    page: '/apps/oursome/',
    support: '/apps/oursome/support/',
    privacy: '/apps/oursome/privacy/',
    deleteData: '/apps/oursome/delete-data/',
  });
});

test('dates render in British style', () => {
  assert.equal(formatDate('2026-11-16'), '16 November 2026');
});

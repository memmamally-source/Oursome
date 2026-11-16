import { test } from 'node:test';
import assert from 'node:assert/strict';
import { company, entityStatement, legalName } from '../../src/config/company.ts';
import { readinessGaps, hasVisiblePlaceholders } from '../../src/lib/readiness.ts';

test('the company is Karoo Fox (Pty) Ltd, and EM Medical Group is not mentioned', () => {
  assert.equal(company.nameAmendmentComplete, true);
  assert.equal(legalName(), 'Karoo Fox (Pty) Ltd');
  const s = entityStatement();
  assert.equal(s, 'Karoo Fox (Pty) Ltd is a private company registered in South Africa.');
  assert.doesNotMatch(s, /EM Medical/);
});

test('readiness reports missing details and a missing domain', () => {
  const gaps = readinessGaps(company, [], 'http://localhost:4321');
  assert.ok(gaps.some((g) => g.item.startsWith('CIPC registration number') && g.blocksPublish));
  assert.ok(gaps.some((g) => g.area === 'Domain' && g.blocksApple && !g.blocksPublish));
  assert.ok(hasVisiblePlaceholders(company));
});

test('a fully configured company has no publishing blockers', () => {
  const full = {
    ...company,
    registrationNumber: '2000/000000/07',
    address: ['1 Example Street', 'Pretoria'],
    emails: { general: 'hello@example.com', support: 'support@example.com', privacy: 'privacy@example.com' },
    informationOfficer: 'A Person',
    nameAmendmentComplete: true,
  };
  assert.deepEqual(readinessGaps(full, [], 'https://example.com'), []);
  assert.equal(hasVisiblePlaceholders(full), false);
});

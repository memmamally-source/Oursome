import { test } from 'node:test';
import assert from 'node:assert/strict';
import { company, entityStatement, legalName } from '../../src/config/company.ts';
import { readinessGaps, hasVisiblePlaceholders } from '../../src/lib/readiness.ts';

test('before the CIPC amendment the site names EM Medical Group as the legal entity', () => {
  assert.equal(company.nameAmendmentComplete, false);
  assert.equal(legalName(), 'EM Medical Group (Pty) Ltd');
  const s = entityStatement();
  assert.match(s, /brand of EM Medical Group \(Pty\) Ltd/);
  assert.match(s, /intends to change/);
  assert.doesNotMatch(s, /operated by Karoo Fox \(Pty\) Ltd/);
});

test('after the amendment the statement switches to Karoo Fox (Pty) Ltd', () => {
  const after = { ...company, nameAmendmentComplete: true };
  assert.equal(legalName(after), 'Karoo Fox (Pty) Ltd');
  assert.match(entityStatement(after), /operated by Karoo Fox \(Pty\) Ltd \(formerly EM Medical Group \(Pty\) Ltd\)/);
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

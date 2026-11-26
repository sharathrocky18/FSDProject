import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findMatchingAuthCandidates,
  normalizeLoginIdentifier,
  normalizeUsername,
} from './authMatch';

const sampleUsers = [
  {
    id: 'u1',
    email: 'alex.rivera@university.edu',
    username: undefined,
    fullName: 'Alex Rivera',
    passwordHash: 'hash-u1',
  },
  {
    id: 'u2',
    email: 'alex.rivera@gmail.com',
    username: 'alex.rivera',
    fullName: 'Alex Rivera Jr',
    passwordHash: 'hash-u2',
  },
  {
    id: 'u3',
    email: 'preethamvnaik563@gmail.com',
    username: 'preetham_naik',
    fullName: 'Preetham Naik',
    passwordHash: 'hash-u3',
  },
];

test('normalizeLoginIdentifier trims, strips leading @, and lowercases', () => {
  assert.equal(normalizeLoginIdentifier('  @Preetham_Naik  '), 'preetham_naik');
  assert.equal(normalizeLoginIdentifier('  Preetham   Naik '), 'preetham naik');
  assert.equal(normalizeUsername('@Maya_Lin'), 'maya_lin');
});

test('matches by exact email, username, email prefix, and full name', () => {
  assert.equal(findMatchingAuthCandidates(sampleUsers, 'preethamvnaik563@gmail.com')[0]?.id, 'u3');
  assert.equal(findMatchingAuthCandidates(sampleUsers, '@PREETHAM_NAIK')[0]?.id, 'u3');
  assert.equal(findMatchingAuthCandidates(sampleUsers, 'preethamvnaik563')[0]?.id, 'u3');
  assert.equal(findMatchingAuthCandidates(sampleUsers, 'Preetham Naik')[0]?.id, 'u3');
});

test('prioritizes exact username over earlier email local-part collision and includes all candidates', () => {
  const candidates = findMatchingAuthCandidates(sampleUsers, 'alex.rivera');
  assert.deepEqual(
    candidates.map((c) => c.id),
    ['u2', 'u1']
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { verifyPasswordHash } from '../src/services/auth.service.js';

test('respinge hash password assenti o non Argon2id senza errore interno', async () => {
  assert.equal(await verifyPasswordHash('SOSTITUIRE_HASH', 'Password123'), false);
  assert.equal(await verifyPasswordHash(null, 'Password123'), false);
});

test('verifica hash Argon2id validi e password errate', async () => {
  const hash = await argon2.hash('Password123', {
    type: argon2.argon2id,
    memoryCost: 8192,
    timeCost: 1,
    parallelism: 1
  });
  assert.equal(await verifyPasswordHash(hash, 'Password123'), true);
  assert.equal(await verifyPasswordHash(hash, 'Password diversa'), false);
});
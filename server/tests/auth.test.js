import test from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { verifyPasswordHash } from '../src/services/auth.service.js';
import { findUserById } from '../src/repositories/user.repository.js';

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

test('il profilo recupera i dati di registrazione senza selezionare credenziali', async () => {
  let query;
  let parameters;
  const profile = {
    id: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    role: 'CITTADINO',
    accountStatus: 'ATTIVO',
    registeredAt: new Date('2026-01-01T00:00:00Z'),
    neighborhoodId: 3,
    neighborhoodName: 'Brera'
  };
  const connection = {
    async execute(sql, values) {
      query = sql;
      parameters = values;
      return [[profile]];
    }
  };

  const result = await findUserById(7, connection);

  assert.deepEqual(parameters, [7]);
  assert.match(query, /u\.data_registrazione AS registeredAt/);
  assert.match(query, /q\.nome AS neighborhoodName/);
  assert.doesNotMatch(query, /password_hash/);
  assert.equal(result.registeredAt, profile.registeredAt);
  assert.equal(result.neighborhoodName, 'Brera');
});
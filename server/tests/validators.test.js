import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { registerSchema } from '../src/validators/auth.validators.js';
import { reportBodySchema } from '../src/validators/report.validators.js';
import { validate } from '../src/middlewares/validate.js';

test('la validazione query salva i valori convertiti senza sostituire request.query', () => {
  const request = Object.defineProperty({}, 'query', { get: () => ({ page: '2' }) });
  validate(z.object({ page: z.coerce.number() }), 'query')(request, {}, (error) => {
    assert.equal(error, undefined);
  });
  assert.deepEqual(request.validatedQuery, { page: 2 });
});

test('la registrazione accetta dati validi e normalizza la mail', () => {
  const result = registerSchema.safeParse({
    firstName: 'Carlotta',
    lastName: 'Iezzi',
    email: '  CARLOTTA@example.com ',
    password: 'Password123',
    neighborhoodId: 2
  });
  assert.equal(result.success, true);
  assert.equal(result.data.email, 'carlotta@example.com');
});

test('la registrazione rifiuta password deboli', () => {
  const result = registerSchema.safeParse({
    firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com', password: 'debole'
  });
  assert.equal(result.success, false);
});

test('la segnalazione richiede coordinate complete e almeno una categoria', () => {
  const result = reportBodySchema.safeParse({
    title: 'Lampione non funzionante',
    description: 'Il lampione davanti alla fermata non funziona da diversi giorni.',
    neighborhoodId: '2',
    latitude: '45.4642',
    longitude: '',
    visibility: 'PUBBLICA',
    categoryIds: '[2]'
  });
  assert.equal(result.success, false);
});

test('la segnalazione converte i campi multipart validi', () => {
  const result = reportBodySchema.safeParse({
    title: 'Lampione non funzionante',
    description: 'Il lampione davanti alla fermata non funziona da diversi giorni.',
    neighborhoodId: '2',
    address: 'Via Roma 1',
    latitude: '45.4642',
    longitude: '9.1900',
    visibility: 'ANONIMA',
    categoryIds: '[2,6]'
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.categoryIds, [2, 6]);
});

test('la segnalazione richiede una posizione scelta sulla mappa', () => {
  const result = reportBodySchema.safeParse({
    title: 'Lampione non funzionante',
    description: 'Il lampione davanti alla fermata non funziona da diversi giorni.',
    neighborhoodId: '2',
    address: 'Via Roma 1',
    visibility: 'PUBBLICA',
    categoryIds: '[2]'
  });
  assert.equal(result.success, false);
});

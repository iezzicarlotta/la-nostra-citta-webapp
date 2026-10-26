import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { pool } from '../src/config/db.js';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/app.js');
after(() => pool.end());

test('espone un token CSRF associato alla sessione', async () => {
  const response = await request(app).get('/api/auth/csrf').expect(200);
  assert.match(response.body.csrfToken, /^[a-f0-9]{64}$/);
  assert.ok(response.headers['set-cookie']);
});

test('protegge le route riservate', async () => {
  const response = await request(app).get('/api/auth/me').expect(401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('restituisce un errore JSON per route inesistenti', async () => {
  const response = await request(app).get('/api/non-esiste').expect(404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('consente i tile OpenStreetMap nella Content Security Policy', async () => {
  const response = await request(app).get('/api/non-esiste').expect(404);
  assert.ok(response.headers['content-security-policy'].includes('https://*.tile.openstreetmap.org'));
});

test('la lista delle segnalazioni pubbliche accetta query params validi', async () => {
  const response = await request(app)
    .get('/api/reports?page=1&limit=10&sort=newest')
    .expect(200);

  assert.equal(response.body.page, 1);
  assert.equal(response.body.limit, 10);
  assert.ok(Array.isArray(response.body.items));
});

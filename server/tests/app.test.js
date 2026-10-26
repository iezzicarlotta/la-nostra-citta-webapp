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

test('la mappa pubblica restituisce solo campi non sensibili e coordinate valide', async () => {
  const response = await request(app).get('/api/reports/map').expect(200);
  assert.ok(Array.isArray(response.body.items));
  for (const report of response.body.items) {
    assert.ok(Number.isFinite(report.latitude));
    assert.ok(Number.isFinite(report.longitude));
    assert.ok(report.latitude >= -90 && report.latitude <= 90);
    assert.ok(report.longitude >= -180 && report.longitude <= 180);
    assert.ok(Array.isArray(report.categories));
    assert.equal('authorId' in report, false);
    assert.equal('visibility' in report, false);
  }
});

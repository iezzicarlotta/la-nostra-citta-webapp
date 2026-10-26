import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/app.js');

test('valida l’indirizzo prima di contattare il geocoder', async () => {
  const agent = request.agent(app);
  const csrfResponse = await agent.get('/api/auth/csrf').expect(200);
  const response = await agent.post('/api/locations/search')
    .set('x-csrf-token', csrfResponse.body.csrfToken)
    .send({ address: 'Via' })
    .expect(400);

  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});
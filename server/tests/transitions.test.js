import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../src/services/report.service.js';

test('consente il percorso ordinario di moderazione', () => {
  assert.equal(canTransition('Inserita', 'In verifica'), true);
  assert.equal(canTransition('In verifica', 'Approvata'), true);
  assert.equal(canTransition('Approvata', 'Presa in carico'), true);
});

test('impedisce salti e riaperture non previste', () => {
  assert.equal(canTransition('Inserita', 'Chiusa'), false);
  assert.equal(canTransition('Chiusa', 'Approvata'), false);
  assert.equal(canTransition('Stato inesistente', 'Approvata'), false);
});

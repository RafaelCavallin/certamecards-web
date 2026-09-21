import { expect, it } from 'vitest';
import { generateUuidV7 } from './uuid7';

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
it('TU — gera um UUID no formato da versão 7', () => {
  expect(generateUuidV7()).toMatch(UUID_V7_PATTERN);
});

it('TU — gera valores diferentes a cada chamada', () => {
  expect(generateUuidV7()).not.toBe(generateUuidV7());
});

it('TU — os primeiros bytes crescem com o tempo', () => {
  const first = generateUuidV7();
  const later = generateUuidV7();
  expect(later.slice(0, 8) >= first.slice(0, 8)).toBe(true);
});

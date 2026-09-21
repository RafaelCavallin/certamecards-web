import { expect, it } from 'vitest';
import { isLeech } from './card-flags';

it('TU-19 — cartão com 8 lapsos é problemático', () => {
  expect(isLeech({ lapses: 8 })).toBe(true);
});

it('TU-19 — cartão com 7 lapsos não é problemático', () => {
  expect(isLeech({ lapses: 7 })).toBe(false);
});

it('TU-19 — cartão novo, sem estado, não é problemático', () => {
  expect(isLeech(null)).toBe(false);
});

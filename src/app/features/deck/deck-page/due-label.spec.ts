import { expect, it } from 'vitest';
import { dueLabel } from './due-label';

const NOW = new Date('2026-09-17T12:00:00');
it('TU — cartão sem estado é "novo"', () => {
  expect(dueLabel(undefined, NOW)).toBe('novo');
});

it('TU — vencimento hoje', () => {
  expect(dueLabel('2026-09-17T23:00:00', NOW)).toBe('hoje');
});

it('TU — vencimento amanhã', () => {
  expect(dueLabel('2026-09-18T08:00:00', NOW)).toBe('amanhã');
});

it('TU — vencimento em alguns dias', () => {
  expect(dueLabel('2026-09-20T08:00:00', NOW)).toBe('em 3 d');
});

it('TU — vencimento em meses', () => {
  expect(dueLabel('2026-11-16T08:00:00', NOW)).toBe('em 2 meses');
});

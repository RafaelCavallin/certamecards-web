import { expect, it, vi } from 'vitest';
import { daysUntil, examDaysUntil } from './dashboard-dates';

it('TU-21 — daysUntil devolve 0 quando a prova é hoje', () => {
  expect(daysUntil('2026-09-17', new Date('2026-09-17T15:00:00'))).toBe(0);
});

it('TU-21 — daysUntil devolve 1 na véspera', () => {
  expect(daysUntil('2026-09-18', new Date('2026-09-17T23:00:00'))).toBe(1);
});

it('TU-21 — daysUntil devolve a diferença em dias corridos', () => {
  expect(daysUntil('2026-10-25', new Date('2026-09-17T00:00:00'))).toBe(38);
});

it('TU-21 — examDaysUntil devolve null sem data de prova', () => {
  expect(examDaysUntil(null)).toBeNull();
});

it('TU-21 — examDaysUntil delega para daysUntil quando há data', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-17T08:00:00'));
  expect(examDaysUntil('2026-09-17')).toBe(0);
  vi.useRealTimers();
});

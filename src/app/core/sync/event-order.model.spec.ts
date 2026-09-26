import { expect, it } from 'vitest';
import { isHybridClockState } from './event-order.model';

it('TU — isHybridClockState reconhece um relógio válido', () => {
  expect(isHybridClockState({ wallTime: '2026-09-17T12:00:00.000Z', logicalCounter: 0 })).toBe(true);
});

it('TU — isHybridClockState rejeita valores sem os campos esperados', () => {
  expect(isHybridClockState({ wallTime: '2026-09-17T12:00:00.000Z' })).toBe(false);
  expect(isHybridClockState(null)).toBe(false);
  expect(isHybridClockState('2026-09-17T12:00:00.000Z')).toBe(false);
});

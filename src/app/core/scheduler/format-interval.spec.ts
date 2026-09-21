import { expect, it } from 'vitest';
import { formatInterval } from './format-interval';

const FROM = new Date('2026-09-17T12:00:00Z');

it('TU-06 — minutos', () => {
  expect(formatInterval(FROM, new Date('2026-09-17T12:01:00Z'))).toBe('1 min');
});

it('TU-06 — dez minutos', () => {
  expect(formatInterval(FROM, new Date('2026-09-17T12:10:00Z'))).toBe('10 min');
});

it('TU-06 — horas', () => {
  expect(formatInterval(FROM, new Date('2026-09-17T17:00:00Z'))).toBe('5 h');
});

it('TU-06 — dias', () => {
  expect(formatInterval(FROM, new Date('2026-09-21T12:00:00Z'))).toBe('4 d');
});

it('TU-06 — meses', () => {
  expect(formatInterval(FROM, new Date('2026-11-16T12:00:00Z'))).toBe('2 meses');
});

it('TU-06 — anos com fração em vírgula', () => {
  expect(formatInterval(FROM, new Date('2028-03-17T00:00:00Z'))).toBe('1,5 ano');
});

import { expect, it } from 'vitest';
import { formatDatePtBr } from './format-date';

it('TU — formata a data ISO em dd/mm/aaaa no fuso UTC', () => {
  expect(formatDatePtBr('2026-09-19T23:59:00Z')).toBe('19/09/2026');
});

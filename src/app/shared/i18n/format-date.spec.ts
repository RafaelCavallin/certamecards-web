import { expect, it } from 'vitest';
import { formatDatePtBr, formatDateTimePtBr } from './format-date';

it('TU — formata a data ISO em dd/mm/aaaa no fuso UTC', () => {
  expect(formatDatePtBr('2026-09-19T23:59:00Z')).toBe('19/09/2026');
});

it('TU — formata data e hora em pt-BR, 24 horas, no fuso informado', () => {
  expect(formatDateTimePtBr('2026-10-26T16:18:00Z', 'America/Sao_Paulo')).toBe('26/10/2026, 13:18');
});

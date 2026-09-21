import { expect, it } from 'vitest';
import { adminErrorMessage } from './admin-errors';

it('TU — sem erro devolve a mensagem padrão', () => {
  expect(adminErrorMessage(null)).toBe('Não foi possível concluir a ação. Tente de novo.');
});

it('TU — subject_name_taken devolve a mensagem de nome duplicado', () => {
  expect(
    adminErrorMessage({ type: 'x', title: 'x', status: 409, code: 'subject_name_taken', detail: 'x' }),
  ).toContain('Já existe uma matéria');
});

it('TU — código desconhecido devolve a mensagem padrão', () => {
  expect(adminErrorMessage({ type: 'x', title: 'x', status: 500, code: 'algo_inesperado', detail: 'x' })).toBe(
    'Não foi possível concluir a ação. Tente de novo.',
  );
});

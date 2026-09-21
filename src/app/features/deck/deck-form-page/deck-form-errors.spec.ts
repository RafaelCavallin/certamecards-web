import { expect, it } from 'vitest';
import { deckFormErrorMessage } from './deck-form-errors';

it('TU — mensagem padrão quando não há ApiError', () => {
  expect(deckFormErrorMessage(null)).toBe('Não foi possível salvar o deck. Tente de novo.');
});

it('TU — mensagem específica para matéria desativada', () => {
  expect(
    deckFormErrorMessage({ type: 'x', title: 'x', status: 422, code: 'subject_inactive', detail: 'x' }),
  ).toBe('Essa matéria foi desativada. Escolha outra.');
});

it('TU — junta as mensagens de validação por campo', () => {
  const message = deckFormErrorMessage({
    type: 'x',
    title: 'x',
    status: 400,
    code: 'validation_failed',
    detail: 'x',
    fields: [{ field: 'name', code: 'required', message: 'Preencha o nome.' }],
  });
  expect(message).toBe('Preencha o nome.');
});

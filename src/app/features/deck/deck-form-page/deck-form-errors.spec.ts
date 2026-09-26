import { expect, it } from 'vitest';
import { LocalMutationValidationError, LocalStorageFullError } from '../../../core/sync/local-storage-error';
import { deckFormErrorMessage } from './deck-form-errors';

it('TU — mensagem padrão quando o erro é desconhecido', () => {
  expect(deckFormErrorMessage(new Error('x'))).toBe('Não foi possível salvar o deck. Tente de novo.');
});

it('TU — mensagem específica para matéria indisponível offline', () => {
  expect(deckFormErrorMessage(new LocalMutationValidationError('subject_inactive', 'x'))).toBe(
    'Essa matéria não está disponível para uso offline.',
  );
});

it('TU-68 — mensagem de espaço esgotado quando a transação é abortada por quota', () => {
  expect(deckFormErrorMessage(new LocalStorageFullError())).toBe(
    'Não há espaço suficiente no dispositivo para guardar essa alteração. O texto continua no formulário: libere espaço no dispositivo e salve de novo.',
  );
});

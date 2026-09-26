import { expect, it } from 'vitest';
import { LocalMutationValidationError, LocalStorageFullError, isQuotaExceededError } from './local-storage-error';

it('TU-68 — isQuotaExceededError reconhece o QuotaExceededError do navegador', () => {
  const error = new Error('quota');
  error.name = 'QuotaExceededError';
  expect(isQuotaExceededError(error)).toBe(true);
});

it('TU — isQuotaExceededError rejeita erros comuns e valores sem name', () => {
  expect(isQuotaExceededError(new Error('outro'))).toBe(false);
  expect(isQuotaExceededError(null)).toBe(false);
  expect(isQuotaExceededError('quota')).toBe(false);
});

it('TU — LocalStorageFullError carrega uma mensagem orientando o usuário', () => {
  const error = new LocalStorageFullError();
  expect(error.name).toBe('LocalStorageFullError');
  expect(error.message).toContain('espaço');
});

it('TU — LocalMutationValidationError carrega o código e a mensagem', () => {
  const error = new LocalMutationValidationError('subject_inactive', 'Essa matéria não está disponível para uso offline.');
  expect(error.code).toBe('subject_inactive');
  expect(error.message).toBe('Essa matéria não está disponível para uso offline.');
});

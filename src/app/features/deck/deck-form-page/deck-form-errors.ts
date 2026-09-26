import { LocalMutationValidationError, LocalStorageFullError } from '../../../core/sync/local-storage-error';

const DEFAULT_DECK_ERROR_MESSAGE = 'Não foi possível salvar o deck. Tente de novo.';
const DECK_ERROR_MESSAGES: Record<string, string> = {
  subject_inactive: 'Essa matéria não está disponível para uso offline.',
  not_found: 'Esse deck não existe mais neste dispositivo.',
  parent_deleted: 'Esse deck não existe mais neste dispositivo.',
};
export function deckFormErrorMessage(error: unknown): string {
  if (error instanceof LocalStorageFullError) {
    return error.message;
  }
  if (error instanceof LocalMutationValidationError) {
    return DECK_ERROR_MESSAGES[error.code] ?? DEFAULT_DECK_ERROR_MESSAGE;
  }
  return DEFAULT_DECK_ERROR_MESSAGE;
}

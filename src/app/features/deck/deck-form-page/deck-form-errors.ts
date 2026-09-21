import type { ApiError } from '../../../core/api/api-error.model';

const DEFAULT_DECK_ERROR_MESSAGE = 'Não foi possível salvar o deck. Tente de novo.';
const SUBJECT_INACTIVE_MESSAGE = 'Essa matéria foi desativada. Escolha outra.';
export function deckFormErrorMessage(apiError: ApiError | null): string {
  if (apiError === null) {
    return DEFAULT_DECK_ERROR_MESSAGE;
  }
  if (apiError.code === 'subject_inactive') {
    return SUBJECT_INACTIVE_MESSAGE;
  }
  if (apiError.code === 'validation_failed' && apiError.fields !== undefined && apiError.fields.length > 0) {
    return apiError.fields.map((field) => field.message).join(' ');
  }
  return DEFAULT_DECK_ERROR_MESSAGE;
}

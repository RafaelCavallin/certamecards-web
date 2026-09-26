import { LocalMutationValidationError, LocalStorageFullError } from '../../../../core/sync/local-storage-error';

const DEFAULT_CARD_ERROR_MESSAGE = 'Não foi possível salvar o cartão. Tente de novo.';
const CARD_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Esse cartão não existe mais neste dispositivo.',
  parent_deleted: 'Esse deck não existe mais neste dispositivo.',
  deck_card_limit: 'Esse deck já tem o máximo de 5.000 cartões.',
  user_card_limit: 'Sua conta já tem o máximo de 50.000 cartões.',
};
export function cardFormErrorMessage(error: unknown): string {
  if (error instanceof LocalStorageFullError) {
    return error.message;
  }
  if (error instanceof LocalMutationValidationError) {
    return CARD_ERROR_MESSAGES[error.code] ?? DEFAULT_CARD_ERROR_MESSAGE;
  }
  return DEFAULT_CARD_ERROR_MESSAGE;
}

import { extractApiError } from '../api/api-error.model';
import { cardsLabel } from '../../shared/i18n/plural';

export const OFFLINE_MESSAGE = 'Isso precisa de conexão.';
const DEFAULT_MESSAGE = 'Não foi possível concluir a ação. Tente de novo.';
const OFFLINE_STATUS = 0;
const MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  already_subscribed: 'Você já está inscrito neste deck.',
  not_subscribed: 'Você não está inscrito neste deck.',
  deck_not_available: 'Este deck não está mais disponível para inscrição.',
  not_found: 'Este deck não existe mais na biblioteca.',
};
export function cardLimitMessage(requiredCards: number, availableCards: number): string {
  return `Este deck tem ${cardsLabel(requiredCards)} e você só tem espaço para ${availableCards}. Exclua cartões ou cancele uma inscrição.`;
}
export function libraryErrorMessage(error: unknown): string {
  const apiError = extractApiError(error);
  if (apiError === null) {
    return isOfflineError(error) ? OFFLINE_MESSAGE : DEFAULT_MESSAGE;
  }
  if (apiError.code === 'user_card_limit' && apiError.requiredCards !== undefined) {
    return cardLimitMessage(apiError.requiredCards, apiError.availableCards ?? 0);
  }
  return MESSAGES_BY_CODE[apiError.code] ?? DEFAULT_MESSAGE;
}
function isOfflineError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === OFFLINE_STATUS;
}

import type { ApiError } from '../../core/api/api-error.model';

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  subject_name_taken: 'Já existe uma matéria com esse nome.',
  not_found: 'Não encontramos um usuário com esse e-mail.',
  last_admin: 'Você é o único administrador. Conceda o papel a outra pessoa antes de retirar o seu.',
  official_deck_has_subscribers:
    'Este deck tem ou já teve inscritos. Descontinue o deck em vez de excluí-lo ou voltar para rascunho.',
  subject_inactive: 'A matéria escolhida está desativada. Escolha outra.',
  version_conflict: 'Este item foi alterado por outra pessoa. Recarregue a página e tente de novo.',
  deck_card_limit: 'O deck chegou ao limite de 5.000 cartões.',
  forbidden: 'Você não tem permissão para esta ação.',
};
const DETAIL_CODES = new Set(['official_deck_min_cards']);
const DEFAULT_ADMIN_ERROR_MESSAGE = 'Não foi possível concluir a ação. Tente de novo.';
export function adminErrorMessage(apiError: ApiError | null): string {
  if (apiError === null) {
    return DEFAULT_ADMIN_ERROR_MESSAGE;
  }
  if (DETAIL_CODES.has(apiError.code)) {
    return apiError.detail;
  }
  return ADMIN_ERROR_MESSAGES[apiError.code] ?? DEFAULT_ADMIN_ERROR_MESSAGE;
}

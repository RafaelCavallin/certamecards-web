import type { ApiError } from '../../core/api/api-error.model';

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  subject_name_taken: 'Já existe uma matéria com esse nome.',
  not_found: 'Não encontramos um usuário com esse e-mail.',
  last_admin: 'Você é o único administrador. Conceda o papel a outra pessoa antes de retirar o seu.',
};
const DEFAULT_ADMIN_ERROR_MESSAGE = 'Não foi possível concluir a ação. Tente de novo.';
export function adminErrorMessage(apiError: ApiError | null): string {
  if (apiError === null) {
    return DEFAULT_ADMIN_ERROR_MESSAGE;
  }
  return ADMIN_ERROR_MESSAGES[apiError.code] ?? DEFAULT_ADMIN_ERROR_MESSAGE;
}

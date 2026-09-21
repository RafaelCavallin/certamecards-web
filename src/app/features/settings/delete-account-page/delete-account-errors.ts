import type { ApiError } from '../../../core/api/api-error.model';

const DELETE_ACCOUNT_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Senha incorreta.',
  token_expired: 'A confirmação do Google expirou. Tente de novo.',
  last_admin: 'Você é o único administrador. Transfira o papel antes de excluir a conta.',
};
const DEFAULT_DELETE_ACCOUNT_ERROR_MESSAGE = 'Não foi possível excluir sua conta. Tente de novo.';
export function deleteAccountErrorMessage(apiError: ApiError | null): string {
  if (apiError === null) {
    return DEFAULT_DELETE_ACCOUNT_ERROR_MESSAGE;
  }
  return DELETE_ACCOUNT_ERROR_MESSAGES[apiError.code] ?? DEFAULT_DELETE_ACCOUNT_ERROR_MESSAGE;
}

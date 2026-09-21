import type { ApiError } from '../../../core/api/api-error.model';

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_verified: 'Confirme seu e-mail antes de entrar.',
};
const DEFAULT_LOGIN_ERROR_MESSAGE = 'Não foi possível entrar. Tente de novo.';
export function loginErrorMessage(apiError: ApiError | null): string {
  if (apiError === null) {
    return DEFAULT_LOGIN_ERROR_MESSAGE;
  }
  return LOGIN_ERROR_MESSAGES[apiError.code] ?? DEFAULT_LOGIN_ERROR_MESSAGE;
}
export function formatRetryAfter(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const unit = minutes === 1 ? 'minuto' : 'minutos';
  return `Muitas tentativas. Aguarde ${minutes} ${unit} para tentar de novo.`;
}

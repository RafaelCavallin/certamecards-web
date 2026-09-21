import type { ApiError } from '../../../core/api/api-error.model';

const DEFAULT_REGISTER_ERROR_MESSAGE = 'Não foi possível concluir o cadastro. Tente de novo.';
const RATE_LIMITED_MESSAGE = 'Muitas tentativas. Aguarde um pouco e tente de novo.';
export function registerErrorMessage(apiError: ApiError | null): string {
  if (apiError === null) {
    return DEFAULT_REGISTER_ERROR_MESSAGE;
  }
  if (apiError.code === 'rate_limited') {
    return RATE_LIMITED_MESSAGE;
  }
  if (apiError.code === 'validation_failed' && apiError.fields !== undefined && apiError.fields.length > 0) {
    return apiError.fields.map((field) => field.message).join(' ');
  }
  return DEFAULT_REGISTER_ERROR_MESSAGE;
}

const QUOTA_EXCEEDED_ERROR_NAME = 'QuotaExceededError';
export class LocalStorageFullError extends Error {
  constructor() {
    super('Não há espaço suficiente no dispositivo para guardar essa alteração. O texto continua no formulário: libere espaço no dispositivo e salve de novo.');
    this.name = 'LocalStorageFullError';
  }
}
export function isQuotaExceededError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error).name === QUOTA_EXCEEDED_ERROR_NAME
  );
}
export class LocalMutationValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LocalMutationValidationError';
  }
}

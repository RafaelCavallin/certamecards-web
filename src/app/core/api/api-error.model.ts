import { HttpErrorResponse } from '@angular/common/http';

export interface ApiFieldError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}
export interface ApiError {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly fields?: readonly ApiFieldError[];
  readonly retryAfterSeconds?: number;
}
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'detail' in value &&
    typeof value.code === 'string'
  );
}
export function extractApiError(error: unknown): ApiError | null {
  if (!(error instanceof HttpErrorResponse) || !isApiError(error.error)) {
    return null;
  }
  return error.error;
}

import { HttpErrorResponse } from '@angular/common/http';
import { LocalStorageFullError } from './local-storage-error';

export type SyncErrorCategory = 'transient' | 'auth' | 'action' | 'quota';
export interface ClassifiedError {
  readonly category: SyncErrorCategory;
  readonly retryAfterSeconds: number | null;
}
const TRANSIENT_STATUSES = [0, 408, 429];
function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUSES.includes(status) || status >= 500;
}
function retryAfterFrom(error: HttpErrorResponse): number | null {
  const header = error.headers.get('Retry-After');
  const seconds = header === null ? Number.NaN : Number(header);
  return Number.isFinite(seconds) ? seconds : null;
}
export function classifySyncError(error: unknown): ClassifiedError {
  if (error instanceof LocalStorageFullError) {
    return { category: 'quota', retryAfterSeconds: null };
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) {
      return { category: 'auth', retryAfterSeconds: null };
    }
    if (isTransientStatus(error.status)) {
      return { category: 'transient', retryAfterSeconds: retryAfterFrom(error) };
    }
    return { category: 'action', retryAfterSeconds: null };
  }
  return { category: 'transient', retryAfterSeconds: null };
}

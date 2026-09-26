export const BACKOFF_BASE_MS = 2_000;
export const BACKOFF_CAP_MS = 5 * 60_000;
export interface BackoffInput {
  readonly attempt: number;
  readonly retryAfterSeconds: number | null;
}
export function computeBackoffMs(input: BackoffInput, randomFn: () => number = Math.random): number {
  if (input.retryAfterSeconds !== null) {
    return Math.max(input.retryAfterSeconds * 1000, 0);
  }
  const exponential = Math.min(BACKOFF_BASE_MS * 2 ** input.attempt, BACKOFF_CAP_MS);
  return Math.floor(randomFn() * exponential);
}
export function nextRetryAt(nowMs: number, input: BackoffInput, randomFn?: () => number): string {
  return new Date(nowMs + computeBackoffMs(input, randomFn)).toISOString();
}

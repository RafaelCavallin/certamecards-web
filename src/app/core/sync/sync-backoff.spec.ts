import { expect, it } from 'vitest';
import { BACKOFF_CAP_MS, computeBackoffMs, nextRetryAt } from './sync-backoff';

it('TU-72 — usa jitter completo entre 0 e o teto exponencial', () => {
  expect(computeBackoffMs({ attempt: 0, retryAfterSeconds: null }, () => 0)).toBe(0);
  expect(computeBackoffMs({ attempt: 0, retryAfterSeconds: null }, () => 0.999999)).toBeLessThan(2_000);
  expect(computeBackoffMs({ attempt: 1, retryAfterSeconds: null }, () => 0.999999)).toBeLessThan(4_000);
});

it('TU-72 — respeita o teto de 5 minutos mesmo com muitas tentativas', () => {
  expect(computeBackoffMs({ attempt: 20, retryAfterSeconds: null }, () => 1)).toBeLessThanOrEqual(BACKOFF_CAP_MS);
});

it('TU-72 — honra o Retry-After do servidor em vez do exponencial', () => {
  expect(computeBackoffMs({ attempt: 5, retryAfterSeconds: 12 }, () => 1)).toBe(12_000);
});

it('TU-72 — nextRetryAt soma o backoff ao instante atual', () => {
  const nowMs = Date.parse('2026-09-23T00:00:00Z');
  const retryAt = nextRetryAt(nowMs, { attempt: 0, retryAfterSeconds: 10 });
  expect(retryAt).toBe('2026-09-23T00:00:10.000Z');
});

it('TU-72 — retry manual usa retryAfterSeconds=0 para antecipar imediatamente', () => {
  const nowMs = Date.parse('2026-09-23T00:00:00Z');
  expect(nextRetryAt(nowMs, { attempt: 3, retryAfterSeconds: 0 })).toBe('2026-09-23T00:00:00.000Z');
});

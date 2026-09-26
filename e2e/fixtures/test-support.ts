import { request } from '@playwright/test';
import type { Candidate } from './api-client';
import { expectOk, openApi } from './api-session';

const BASE_URL = 'https://certamecards.localhost';
export type SeedScenario = 'due_cards' | 'leech_card' | 'large_deck';
export interface SeedResult {
  readonly deckId: string;
  readonly cardIds: readonly string[];
}
export interface SeedOptions {
  readonly count?: number;
  readonly subjectName?: string;
}
export async function seedForCandidate(
  candidate: Candidate,
  scenario: SeedScenario,
  options: SeedOptions = {},
): Promise<SeedResult> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const accessToken = await login(context, candidate);
    const response = await context.post(`${BASE_URL}/api/test-support/seed`, {
      data: { scenario, count: options.count ?? 1, subjectName: options.subjectName },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok()) {
      throw new Error(`Falha ao semear dados de teste: ${response.status()}`);
    }
    return (await response.json()) as SeedResult;
  } finally {
    await context.dispose();
  }
}
export async function revokeSessions(candidate: Candidate): Promise<void> {
  const api = await openApi(candidate);
  try {
    await expectOk(await api.post('/api/test-support/revoke-sessions'), 'revogar sessões de teste');
  } finally {
    await api.dispose();
  }
}
async function login(context: Awaited<ReturnType<typeof request.newContext>>, candidate: Candidate): Promise<string> {
  const response = await context.post(`${BASE_URL}/api/auth/login`, {
    data: { email: candidate.email, password: candidate.password },
  });
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}
export interface CardReviewHistory {
  readonly reviewLogs: readonly { readonly kind: string }[];
  readonly reviewVoids: readonly unknown[];
}
export async function fetchCardReviewHistory(candidate: Candidate, cardId: string): Promise<CardReviewHistory> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const accessToken = await login(context, candidate);
    const response = await context.get(`${BASE_URL}/api/cards/${cardId}/reviews`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return (await response.json()) as CardReviewHistory;
  } finally {
    await context.dispose();
  }
}
export interface CardStateSnapshot {
  readonly cardId: string;
  readonly due: string;
  readonly state: number;
}
export async function fetchCardStates(candidate: Candidate): Promise<readonly CardStateSnapshot[]> {
  return fetchChangesOfType<CardStateSnapshot>(candidate, 'card_state');
}
interface ChangesResponse {
  readonly changes: readonly { readonly type: string; readonly payload: unknown }[];
  readonly hasMore: boolean;
  readonly nextCursor: number;
}
export async function fetchChangesOfType<T>(candidate: Candidate, type: string): Promise<readonly T[]> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const accessToken = await login(context, candidate);
    return await fetchAllChangesOfType<T>(context, accessToken, type);
  } finally {
    await context.dispose();
  }
}
async function fetchAllChangesOfType<T>(
  context: Awaited<ReturnType<typeof request.newContext>>,
  accessToken: string,
  type: string,
): Promise<readonly T[]> {
  const payloads: T[] = [];
  let cursor = 0;
  let hasMore = true;
  while (hasMore) {
    const response = await context.get(`${BASE_URL}/api/sync/changes`, {
      params: { cursor, limit: 500 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok()) {
      throw new Error(`Falha ao ler mudanças de sincronização: ${response.status()}`);
    }
    const body = (await response.json()) as ChangesResponse;
    const { hasMore: nextHasMore, nextCursor } = body;
    payloads.push(...body.changes.filter((change) => change.type === type).map((change) => change.payload as T));
    cursor = nextCursor;
    hasMore = nextHasMore;
  }
  return payloads;
}
export interface ServerSettings {
  readonly newPerDay: number;
  readonly theme: string;
}
export async function fetchServerSettings(candidate: Candidate): Promise<ServerSettings> {
  const api = await openApi(candidate);
  try {
    const response = await api.get('/api/me/settings');
    await expectOk(response, 'ler ajustes');
    return (await response.json()) as ServerSettings;
  } finally {
    await api.dispose();
  }
}

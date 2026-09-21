import { request } from '@playwright/test';
import type { Candidate } from './api-client';

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
async function login(context: Awaited<ReturnType<typeof request.newContext>>, candidate: Candidate): Promise<string> {
  const response = await context.post(`${BASE_URL}/api/auth/login`, {
    data: { email: candidate.email, password: candidate.password },
  });
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}
export interface CardReviewHistory {
  readonly reviewLogs: readonly unknown[];
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
}
export async function fetchCardStates(candidate: Candidate): Promise<readonly CardStateSnapshot[]> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const accessToken = await login(context, candidate);
    const response = await context.get(`${BASE_URL}/api/sync/changes`, {
      params: { cursor: 0, limit: 200 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json()) as { cardStates: readonly CardStateSnapshot[] };
    return body.cardStates;
  } finally {
    await context.dispose();
  }
}

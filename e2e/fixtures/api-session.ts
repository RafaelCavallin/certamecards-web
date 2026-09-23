import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import type { Candidate } from './api-client';

export const BASE_URL = 'https://certamecards.localhost';
export type ApiUser = Pick<Candidate, 'email' | 'password'>;
export async function loginToken(user: ApiUser): Promise<string> {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const response = await context.post(`${BASE_URL}/api/auth/login`, { data: user });
    const body = (await response.json()) as { accessToken: string };
    return body.accessToken;
  } finally {
    await context.dispose();
  }
}
export async function openApi(user: ApiUser): Promise<APIRequestContext> {
  const token = await loginToken(user);
  return request.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}
export async function expectOk(response: Awaited<ReturnType<APIRequestContext['get']>>, action: string): Promise<void> {
  if (!response.ok()) {
    throw new Error(`Falha ao ${action}: ${response.status()} ${await response.text()}`);
  }
}

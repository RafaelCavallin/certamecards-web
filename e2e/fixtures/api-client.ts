import { request } from '@playwright/test';

const BASE_URL = 'https://certamecards.localhost';
const TEST_USERS_PATH = '/api/test-support/users';
export interface Candidate {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}
export async function createConfirmedCandidate(displayName?: string): Promise<Candidate> {
  const candidate = randomCandidate(displayName);
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const response = await context.post(`${BASE_URL}${TEST_USERS_PATH}`, {
      data: { ...candidate, timeZone: 'America/Sao_Paulo' },
    });
    if (!response.ok()) {
      throw new Error(`Falha ao criar candidato de teste: ${response.status()}`);
    }
  } finally {
    await context.dispose();
  }
  return candidate;
}
function randomCandidate(displayName = 'Candidata de teste'): Candidate {
  const id = crypto.randomUUID();
  return {
    email: `candidato-${id}@teste.certamecards.local`,
    password: 'senha-teste-1234',
    displayName,
  };
}

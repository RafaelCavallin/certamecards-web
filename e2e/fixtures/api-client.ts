import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { waitForEmailLink } from './mailpit';

const BASE_URL = 'https://certamecards.localhost';
const TERMS_VERSION = '2026-09-01';
const CONFIRMATION_EMAIL_SUBJECT = 'Confirme seu e-mail';
const USER_AUTH_CACHE_TTL_MS = 31_000;
export interface Candidate {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}
export async function createConfirmedCandidate(): Promise<Candidate> {
  const candidate = randomCandidate();
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    await registerCandidate(context, candidate);
    const link = await waitForEmailLink(candidate.email, CONFIRMATION_EMAIL_SUBJECT);
    await confirmFromLink(context, link);
    await acceptTerms(context, candidate);
  } finally {
    await context.dispose();
  }
  return candidate;
}
function randomCandidate(): Candidate {
  const id = crypto.randomUUID();
  return {
    email: `candidato-${id}@teste.certamecards.local`,
    password: 'senha-teste-1234',
    displayName: 'Candidata de teste',
  };
}
async function registerCandidate(context: APIRequestContext, candidate: Candidate): Promise<void> {
  const response = await context.post(`${BASE_URL}/api/auth/register`, {
    data: {
      email: candidate.email,
      password: candidate.password,
      displayName: candidate.displayName,
      acceptedTermsVersion: TERMS_VERSION,
      timeZone: 'America/Sao_Paulo',
    },
  });
  if (!response.ok()) {
    throw new Error(`Falha ao cadastrar candidato de teste: ${response.status()}`);
  }
}
async function confirmFromLink(context: APIRequestContext, link: string): Promise<void> {
  const response = await context.post(`${BASE_URL}/api/auth/confirm-email`, { data: { token: extractToken(link) } });
  if (!response.ok()) {
    throw new Error(`Falha ao confirmar e-mail de teste: ${response.status()}`);
  }
}
async function acceptTerms(context: APIRequestContext, candidate: Candidate): Promise<void> {
  const login = await context.post(`${BASE_URL}/api/auth/login`, {
    data: { email: candidate.email, password: candidate.password },
  });
  const body = (await login.json()) as { accessToken: string };
  const response = await context.post(`${BASE_URL}/api/me/terms`, {
    data: { version: TERMS_VERSION },
    headers: { Authorization: `Bearer ${body.accessToken}` },
  });
  if (!response.ok()) {
    throw new Error(`Falha ao aceitar os termos do candidato de teste: ${response.status()}`);
  }
  // certamecards-api guarda o usuário autenticado em cache por 30s (UserAuthCache); sem esperar,
  // o próximo request autenticado ainda veria termsAccepted=false.
  await new Promise((resolve) => setTimeout(resolve, USER_AUTH_CACHE_TTL_MS));
}
function extractToken(link: string): string {
  const hashIndex = link.indexOf('#');
  const token = hashIndex === -1 ? null : new URLSearchParams(link.slice(hashIndex + 1)).get('token');
  if (token === null) {
    throw new Error(`Token não encontrado no link: ${link}`);
  }
  return token;
}

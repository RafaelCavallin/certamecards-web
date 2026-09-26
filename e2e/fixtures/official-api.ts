import type { APIRequestContext } from '@playwright/test';
import type { Candidate } from './api-client';
import { expectOk, openApi } from './api-session';

const BASIC_CARD_TYPE = 'basic';
const MIN_PUBLISHABLE_CARDS = 5;
export interface OfficialDeckSeed {
  readonly deckId: string;
  readonly name: string;
  readonly cardIds: readonly string[];
}
export interface OfficialDeckOptions {
  readonly name: string;
  readonly subjectName: string;
  readonly cardCount?: number;
}
interface AdminSubject {
  readonly id: string;
  readonly name: string;
}
interface Versioned {
  readonly version: number;
}
async function subjectIdByName(api: APIRequestContext, name: string): Promise<string> {
  const response = await api.get('/api/admin/subjects');
  await expectOk(response, 'listar matérias');
  const subject = ((await response.json()) as readonly AdminSubject[]).find((item) => item.name === name);
  if (subject === undefined) {
    throw new Error(`Matéria não encontrada: ${name}`);
  }
  return subject.id;
}
async function createDraft(api: APIRequestContext, options: OfficialDeckOptions): Promise<string> {
  const id = crypto.randomUUID();
  const subjectId = await subjectIdByName(api, options.subjectName);
  const data = { id, subjectId, name: options.name, description: `Descrição de ${options.name}` };
  await expectOk(await api.post('/api/admin/official-decks', { data }), 'criar deck oficial');
  return id;
}
async function addCards(api: APIRequestContext, deckId: string, count: number): Promise<readonly string[]> {
  const cardIds: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = crypto.randomUUID();
    const data = { id, type: BASIC_CARD_TYPE, front: `Pergunta ${index}`, back: `Resposta ${index}`, source: null };
    await expectOk(await api.post(`/api/admin/official-decks/${deckId}/cards`, { data }), 'criar cartão oficial');
    cardIds.push(id);
  }
  return cardIds;
}
async function publish(api: APIRequestContext, deckId: string): Promise<void> {
  const deck = await api.get(`/api/admin/official-decks/${deckId}`);
  const { version } = (await deck.json()) as Versioned;
  const headers = { 'If-Match': String(version) };
  await expectOk(await api.put(`/api/admin/official-decks/${deckId}/status`, { data: { status: 'published' }, headers }), 'publicar');
}
export async function publishOfficialDeck(admin: Candidate, options: OfficialDeckOptions): Promise<OfficialDeckSeed> {
  const api = await openApi(admin);
  try {
    const deckId = await createDraft(api, options);
    const cardIds = await addCards(api, deckId, options.cardCount ?? MIN_PUBLISHABLE_CARDS);
    await publish(api, deckId);
    return { deckId, name: options.name, cardIds };
  } finally {
    await api.dispose();
  }
}
export async function subscribeByApi(candidate: Candidate, deckId: string): Promise<void> {
  const api = await openApi(candidate);
  try {
    await expectOk(await api.post(`/api/library/decks/${deckId}/subscription`), 'inscrever no deck oficial');
  } finally {
    await api.dispose();
  }
}
export async function deleteOfficialCard(admin: Candidate, deckId: string, cardId: string): Promise<void> {
  const api = await openApi(admin);
  try {
    const page = (await (await api.get(`/api/admin/official-decks/${deckId}/cards`)).json()) as {
      readonly items: readonly { readonly id: string; readonly version: number }[];
    };
    const card = page.items.find((item) => item.id === cardId);
    const headers = { 'If-Match': String(card?.version ?? 0) };
    await expectOk(await api.delete(`/api/admin/official-cards/${cardId}`, { headers }), 'remover cartão oficial');
  } finally {
    await api.dispose();
  }
}

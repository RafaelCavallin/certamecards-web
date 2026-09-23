import type { Candidate } from './api-client';
import { expectOk, openApi } from './api-session';

export async function discontinueByApi(admin: Candidate, deckId: string): Promise<void> {
  const api = await openApi(admin);
  try {
    const { version } = (await (await api.get(`/api/admin/official-decks/${deckId}`)).json()) as { version: number };
    const headers = { 'If-Match': String(version) };
    await expectOk(await api.put(`/api/admin/official-decks/${deckId}/status`, { data: { status: 'discontinued' }, headers }), 'descontinuar');
  } finally {
    await api.dispose();
  }
}
export async function duplicateByApi(candidate: Candidate, deckId: string): Promise<void> {
  const api = await openApi(candidate);
  try {
    const data = { id: crypto.randomUUID(), carryProgress: false, cancelSubscription: false };
    await expectOk(await api.post(`/api/library/decks/${deckId}/duplicate`, { data }), 'duplicar deck oficial');
  } finally {
    await api.dispose();
  }
}

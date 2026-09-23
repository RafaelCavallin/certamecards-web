import type { Candidate } from './api-client';
import { expectOk, openApi } from './api-session';
import { uniqueName } from './official-names';

interface CardsPage {
  readonly items: readonly { readonly id: string; readonly version: number }[];
}
export async function markContentChange(admin: Candidate, deckId: string, note: string): Promise<void> {
  const api = await openApi(admin);
  try {
    const page = (await (await api.get(`/api/admin/official-decks/${deckId}/cards`)).json()) as CardsPage;
    const card = page.items[0];
    const headers = { 'If-Match': String(card?.version ?? 0) };
    const data = { back: 'Resposta com nova redação', contentChanged: true, note };
    await expectOk(await api.patch(`/api/admin/official-cards/${card?.id ?? ''}`, { data, headers }), 'alterar conteúdo');
  } finally {
    await api.dispose();
  }
}
export async function createAndDeactivateSubject(admin: Candidate): Promise<string> {
  const api = await openApi(admin);
  try {
    const name = uniqueName('Matéria de teste');
    const created = await api.post('/api/admin/subjects', { data: { name } });
    await expectOk(created, 'criar matéria');
    const { id } = (await created.json()) as { id: string };
    await expectOk(await api.patch(`/api/admin/subjects/${id}`, { data: { active: false } }), 'desativar matéria');
    return name;
  } finally {
    await api.dispose();
  }
}

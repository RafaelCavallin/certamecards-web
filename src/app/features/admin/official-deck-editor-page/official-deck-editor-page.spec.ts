import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { AdminApi } from '../../../core/api/admin-api';
import { OfficialDecksApi } from '../../../core/api/official-decks-api';
import { queryAll, rootText, setInputValue, submitForm, waitFor } from '../../../testing/dom-testing';
import { aDeckSummary, aPageOf, routingMocks, spyNavigate } from '../official-test-support';
import { OfficialDeckEditorPage } from './official-deck-editor-page';

const SUBJECTS = [
  { id: 's1', name: 'Direito', active: true, changeSeq: 1, deckCount: 1 },
  { id: 's2', name: 'Antiga', active: false, changeSeq: 2, deckCount: 0 },
];
type Api = Record<'get' | 'create' | 'update' | 'listCards', ReturnType<typeof vi.fn>>;

async function setup(deckId: string | null): Promise<{ fixture: ReturnType<typeof TestBed.createComponent<OfficialDeckEditorPage>>; api: Api }> {
  const mocks = routingMocks(deckId === null ? {} : { id: deckId });
  const api: Api = {
    get: vi.fn().mockResolvedValue(aDeckSummary()),
    create: vi.fn().mockResolvedValue(aDeckSummary({ id: 'novo', status: 'draft' })),
    update: vi.fn().mockResolvedValue(aDeckSummary({ name: 'Renomeado', version: 5 })),
    listCards: vi.fn().mockResolvedValue(aPageOf([])),
  };
  TestBed.configureTestingModule({
    providers: [
      ...(mocks.providers as Provider[]),
      { provide: OfficialDecksApi, useValue: api },
      { provide: AdminApi, useValue: { listSubjects: vi.fn().mockResolvedValue(SUBJECTS) } },
    ],
  });
  const fixture = TestBed.createComponent(OfficialDeckEditorPage);
  fixture.detectChanges();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Carregando deck') === false;
  });
  return { fixture, api };
}

it('CA-11 — deck existente mostra situação, contagens e as transições', async () => {
  const { fixture } = await setup('d1');
  const text = rootText(fixture) ?? '';
  expect(text).toContain('Publicado · 12 cartões · 120 inscritos · 2 apontamentos abertos');
  expect(text).toContain('Descontinuar');
});

it('CA-11 — só oferece matérias ativas', async () => {
  const { fixture } = await setup('d1');
  const options = queryAll(fixture, '#deck-subject option').map((option) => option.textContent?.trim());
  expect(options).toContain('Direito');
  expect(options).not.toContain('Antiga');
});

it('CA-11 — salvar envia a versão atual (If-Match) e mostra o nome atualizado', async () => {
  const { fixture, api } = await setup('d1');
  setInputValue(fixture, '#deck-name', 'Renomeado');
  fixture.detectChanges();
  submitForm(fixture, 'app-deck-form form');
  await waitFor(() => api.update.mock.calls.length > 0);
  expect(api.update).toHaveBeenCalledWith('d1', 4, expect.objectContaining({ name: 'Renomeado' }));
});

it('CA-11 — novo deck cria em rascunho e abre o editor do deck criado', async () => {
  const { fixture, api } = await setup(null);
  const navigate = spyNavigate();
  await waitFor(() => {
    fixture.detectChanges();
    return queryAll(fixture, '#deck-subject option').length > 1;
  });
  setInputValue(fixture, '#deck-name', 'Deck novo');
  (queryAll(fixture, '#deck-subject')[0] as HTMLSelectElement).value = 's1';
  queryAll(fixture, '#deck-subject')[0]?.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  submitForm(fixture, 'app-deck-form form');
  await waitFor(() => api.create.mock.calls.length > 0);
  expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Deck novo', subjectId: 's1', description: null }));
  await waitFor(() => navigate.mock.calls.length > 0);
  expect(navigate).toHaveBeenCalledWith(['/admin/decks-oficiais', 'novo']);
  expect(rootText(fixture)).toContain('Novo deck oficial');
});

it('CA-11 — erro ao salvar mostra a mensagem e não some o formulário', async () => {
  const { fixture, api } = await setup('d1');
  api.update.mockRejectedValue(new Error('x'));
  submitForm(fixture, 'app-deck-form form');
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Não foi possível concluir a ação') === true;
  });
});

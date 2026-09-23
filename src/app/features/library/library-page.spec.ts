import { TestBed } from '@angular/core/testing';
import type { Provider } from '@angular/core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { clickElement, queryAll, rootText, setInputValue } from '../../testing/dom-testing';
import { LibraryPage } from './library-page/library-page';
import { aPage, aSummary, libraryProviders } from './library-test-support';
import type { LibraryMocks } from './library-test-support';

async function setup(online = true, deckParam: string | null = null): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<LibraryPage>>;
  mocks: LibraryMocks;
}> {
  const { mocks, providers } = libraryProviders(online, deckParam);
  TestBed.configureTestingModule({ providers: providers as Provider[] });
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(0);
  fixture.detectChanges();
  return { fixture, mocks };
}
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it('CA-01 — a lista mostra matéria, nome, descrição, cartões, atualização e o selo Oficial', async () => {
  const { fixture } = await setup();
  const text = rootText(fixture) ?? '';
  for (const expected of ['Direito Constitucional', 'CF/88 — princípios', 'Fundamentos e objetivos.', '12 cartões', '19/09/2026', 'Oficial']) {
    expect(text).toContain(expected);
  }
});

it('CA-01 — anuncia o número de resultados em região viva', async () => {
  const { fixture } = await setup();
  const live = queryAll(fixture, '[aria-live="polite"]').map((element) => element.textContent);
  expect(live).toContain('1 deck encontrado');
});

it('CA-02 — a busca ignora acentos e maiúsculas e consulta o servidor', async () => {
  const { fixture, mocks } = await setup();
  setInputValue(fixture, '#library-search', 'Crasé');
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(300);
  expect(mocks.api.list).toHaveBeenLastCalledWith({ q: 'crase', subjectId: null, page: 0 });
  expect(mocks.record).toHaveBeenCalledWith('library_searched', { hasQuery: true, hasSubject: false, resultCount: 1 });
});

it('CA-03 — o filtro por matéria consulta o servidor com a matéria escolhida', async () => {
  const { fixture, mocks } = await setup();
  queryAll(fixture, '[aria-label="Filtrar por matéria"] button')[1]?.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.api.list).toHaveBeenLastCalledWith({ q: '', subjectId: 's1', page: 0 });
  expect(mocks.record).toHaveBeenCalledWith('library_searched', { hasQuery: false, hasSubject: true, resultCount: 1 });
});

it('CA-01 — deck inscrito mostra "Inscrito" e a ação leva ao deck', async () => {
  const { fixture, mocks } = await setup();
  mocks.api.list?.mockResolvedValue(aPage([aSummary({ subscribed: true })]));
  clickElement(fixture, '[aria-label="Filtrar por matéria"] button');
  await vi.advanceTimersByTimeAsync(0);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Inscrito');
  queryAll(fixture, 'app-library-deck-item button').find((button) => button.textContent === 'Abrir deck')?.click();
  expect(mocks.navigate).toHaveBeenCalledWith(['/decks', 'd1']);
});

it('CA-01 — "Ver prévia" abre a prévia do deck escolhido', async () => {
  const { fixture, mocks } = await setup();
  queryAll(fixture, 'app-library-deck-item button')[0]?.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.api.preview).toHaveBeenCalledWith('d1');
  expect(mocks.record).toHaveBeenCalledWith('deck_preview_opened', { deckId: 'd1' });
});

it('CA-27 — o parâmetro ?deck= abre a prévia direto', async () => {
  const { mocks } = await setup(true, 'd9');
  expect(mocks.api.preview).toHaveBeenCalledWith('d9');
});

it('TU — "Voltar ao painel" navega para a raiz', async () => {
  const { fixture, mocks } = await setup();
  queryAll(fixture, 'header button')[0]?.click();
  expect(mocks.navigate).toHaveBeenCalledWith(['/']);
});

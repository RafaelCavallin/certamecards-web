import { TestBed } from '@angular/core/testing';
import type { Provider } from '@angular/core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocalDb } from '../../core/db/local-db';
import { queryAll, rootText, setInputValue } from '../../testing/dom-testing';
import { LibraryPage } from './library-page/library-page';
import { aPage, aSummary, libraryProviders } from './library-test-support';
import type { LibraryMocks } from './library-test-support';

async function setup(online = true, configure?: (mocks: LibraryMocks) => void): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<LibraryPage>>;
  mocks: LibraryMocks;
}> {
  const { mocks, providers } = libraryProviders(online);
  configure?.(mocks);
  TestBed.configureTestingModule({ providers: providers as Provider[] });
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(0);
  fixture.detectChanges();
  return { fixture, mocks };
}
function buttonByText(fixture: ReturnType<typeof TestBed.createComponent<LibraryPage>>, text: string): HTMLElement | undefined {
  return queryAll(fixture, 'button').find((button) => button.textContent?.trim() === text);
}
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it('TI-56 — sem rede mostra "Isso precisa de conexão", não chama a API e a outbox fica vazia', async () => {
  const { fixture, mocks } = await setup(false);
  expect(rootText(fixture)).toContain('Isso precisa de conexão.');
  expect(mocks.api.list).not.toHaveBeenCalled();
  expect(mocks.api.subjects).not.toHaveBeenCalled();
  vi.useRealTimers();
  expect(await TestBed.inject(LocalDb).outbox.count()).toBe(0);
  buttonByText(fixture, 'Voltar ao painel')?.click();
  expect(mocks.navigate).toHaveBeenCalledWith(['/']);
});

it('TI-56 — ao voltar a rede, a biblioteca carrega sozinha', async () => {
  const { fixture, mocks } = await setup(false);
  mocks.online.set(true);
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(0);
  fixture.detectChanges();
  expect(mocks.api.list).toHaveBeenCalledOnce();
  expect(rootText(fixture)).toContain('CF/88 — princípios');
});

it('CA-01 — mostra "Carregando" enquanto a primeira resposta não chega', async () => {
  const { fixture } = await setup(true, (mocks) => mocks.api.list?.mockReturnValue(new Promise(() => undefined)));
  expect(rootText(fixture)).toContain('Carregando a biblioteca');
});

it('CA-01 — biblioteca vazia mostra a explicação', async () => {
  const { fixture } = await setup(true, (mocks) => mocks.api.list?.mockResolvedValue(aPage([])));
  expect(rootText(fixture)).toContain('A biblioteca ainda está vazia');
});

it('CA-02 — sem resultados oferece limpar a busca e recarrega tudo', async () => {
  const { fixture, mocks } = await setup();
  mocks.api.list?.mockResolvedValue(aPage([]));
  setInputValue(fixture, '#library-search', 'zzzz');
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(300);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Nenhum deck encontrado');
  buttonByText(fixture, 'Limpar busca e filtros')?.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.api.list).toHaveBeenLastCalledWith({ q: '', subjectId: null, page: 0 });
});

it('CA-01 — erro mostra a mensagem e "Tentar de novo" recarrega', async () => {
  const { fixture, mocks } = await setup(true, (m) => m.api.list?.mockRejectedValueOnce(new Error('x')));
  expect(rootText(fixture)).toContain('Não foi possível carregar a biblioteca');
  buttonByText(fixture, 'Tentar de novo')?.click();
  await vi.advanceTimersByTimeAsync(0);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('CF/88 — princípios');
  expect(mocks.api.list).toHaveBeenCalledTimes(2);
});

it('CA-01 — paginação pede a página seguinte', async () => {
  const items = [aSummary()];
  const { fixture, mocks } = await setup(true, (m) => m.api.list?.mockResolvedValue(aPage(items, { total: 45 })));
  buttonByText(fixture, 'Próxima')?.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.api.list).toHaveBeenLastCalledWith({ q: '', subjectId: null, page: 1 });
});

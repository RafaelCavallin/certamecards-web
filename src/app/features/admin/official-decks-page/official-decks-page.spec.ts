import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { AdminApi } from '../../../core/api/admin-api';
import { OfficialDecksApi } from '../../../core/api/official-decks-api';
import { queryAll, rootText, waitFor } from '../../../testing/dom-testing';
import { aDeckSummary, aPageOf, routingMocks } from '../official-test-support';
import { OfficialDecksPage } from './official-decks-page';
import { selectOption as select, setupDecksPage as setup } from './official-decks-page-harness';

it('CA-17 — a lista mostra situação, matéria, nome, cartões, inscritos, apontamentos e atualização', async () => {
  const { fixture } = await setup();
  const text = rootText(fixture) ?? '';
  for (const expected of ['Publicado', 'Direito Constitucional', 'CF/88', '12', '120', '2', '19/09/2026']) {
    expect(text).toContain(expected);
  }
});

it('CA-17 — filtrar por situação e matéria consulta o servidor', async () => {
  const { fixture, list } = await setup();
  select(fixture, 'filter-status', 'draft');
  await waitFor(() => list.mock.calls.length >= 2);
  expect(list).toHaveBeenLastCalledWith({ status: 'draft', subjectId: null, page: 0 });
  select(fixture, 'filter-subject', 's1');
  await waitFor(() => list.mock.calls.length >= 3);
  expect(list).toHaveBeenLastCalledWith({ status: 'draft', subjectId: 's1', page: 0 });
  select(fixture, 'filter-status', '');
  await waitFor(() => list.mock.calls.length >= 4);
  expect(list).toHaveBeenLastCalledWith({ status: null, subjectId: 's1', page: 0 });
});

it('CA-17 — lista vazia mostra a mensagem', async () => {
  const { fixture } = await setup(vi.fn().mockResolvedValue(aPageOf([])));
  expect(rootText(fixture)).toContain('Nenhum deck oficial encontrado');
});

it('CA-17 — erro mostra alerta e "Tentar de novo" recarrega', async () => {
  const list = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(aPageOf([aDeckSummary()]));
  const { fixture } = await setup(list);
  expect(rootText(fixture)).toContain('Não foi possível carregar os decks oficiais');
  queryAll(fixture, 'button').find((button) => button.textContent === 'Tentar de novo')?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('CF/88') === true;
  });
});

it('CA-04 — sem rede não consulta e desabilita "Novo deck"', () => {
  const mocks = routingMocks();
  mocks.online.set(false);
  const list = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      ...(mocks.providers as Provider[]),
      { provide: OfficialDecksApi, useValue: { list } },
      { provide: AdminApi, useValue: { listSubjects: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(OfficialDecksPage);
  fixture.detectChanges();
  expect(list).not.toHaveBeenCalled();
  expect(rootText(fixture)).toContain('Isso precisa de conexão');
  const button = queryAll(fixture, 'button').find((item) => item.textContent === 'Novo deck') as HTMLButtonElement;
  expect(button.disabled).toBe(true);
});

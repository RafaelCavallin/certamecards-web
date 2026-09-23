import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { OfficialDecksApi } from '../../../../core/api/official-decks-api';
import type { OfficialDeckAdminSummary } from '../../../../core/api/official-deck.model';
import { queryAll, rootText, waitFor } from '../../../../testing/dom-testing';
import { aDeckSummary } from '../../official-test-support';
import { OfficialStatusActions } from './official-status-actions';

function setup(deck: OfficialDeckAdminSummary, api: Record<string, ReturnType<typeof vi.fn>>, online = true): {
  fixture: ReturnType<typeof TestBed.createComponent<OfficialStatusActions>>;
  changed: ReturnType<typeof vi.fn>;
  deleted: ReturnType<typeof vi.fn>;
} {
  TestBed.configureTestingModule({ providers: [{ provide: OfficialDecksApi, useValue: api }] });
  const fixture = TestBed.createComponent(OfficialStatusActions);
  const changed = vi.fn();
  const deleted = vi.fn();
  fixture.componentInstance.changed.subscribe(changed);
  fixture.componentInstance.deleted.subscribe(deleted);
  fixture.componentRef.setInput('deck', deck);
  fixture.componentRef.setInput('online', online);
  fixture.detectChanges();
  return { fixture, changed, deleted };
}
function click(fixture: ReturnType<typeof setup>['fixture'], text: string): void {
  queryAll(fixture, 'button').find((button) => button.textContent?.trim() === text)?.click();
  fixture.detectChanges();
}
function labels(fixture: ReturnType<typeof setup>['fixture']): string[] {
  return queryAll(fixture, 'button').map((button) => button.textContent?.trim() ?? '');
}

it('CA-17 — cada situação oferece só as transições possíveis', () => {
  expect(labels(setup(aDeckSummary({ status: 'draft' }), {}).fixture)).toEqual(['Publicar', 'Excluir deck']);
});

it('CA-17 — deck publicado oferece voltar para rascunho e descontinuar', () => {
  expect(labels(setup(aDeckSummary({ status: 'published' }), {}).fixture)).toEqual(['Voltar para rascunho', 'Descontinuar']);
});

it('CA-17 — publicar pede confirmação que explica o efeito e chama a API com a versão', async () => {
  const changeStatus = vi.fn().mockResolvedValue(aDeckSummary({ status: 'published', version: 5 }));
  const { fixture, changed } = setup(aDeckSummary({ status: 'draft', version: 4 }), { changeStatus });
  click(fixture, 'Publicar');
  expect(rootText(fixture)).toContain('pelo menos 5 cartões');
  queryAll(fixture, 'app-confirm-dialog button').find((button) => button.textContent?.trim() === 'Publicar')?.click();
  await waitFor(() => changed.mock.calls.length > 0);
  expect(changeStatus).toHaveBeenCalledWith('d1', 4, 'published');
});

it('CA-18 — publicar com menos de 5 cartões mostra o motivo do servidor', async () => {
  const detail = 'Um deck oficial precisa de pelo menos 5 cartões para ser publicado. Este tem 4.';
  const refused = new HttpErrorResponse({ status: 422, error: { status: 422, code: 'official_deck_min_cards', detail } });
  const { fixture, changed } = setup(aDeckSummary({ status: 'draft' }), { changeStatus: vi.fn().mockRejectedValue(refused) });
  click(fixture, 'Publicar');
  queryAll(fixture, 'app-confirm-dialog button').find((button) => button.textContent?.trim() === 'Publicar')?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Este tem 4') === true;
  });
  expect(changed).not.toHaveBeenCalled();
});

it('CA-19 — excluir com inscritos orienta a descontinuar', async () => {
  const refused = new HttpErrorResponse({ status: 422, error: { status: 422, code: 'official_deck_has_subscribers', detail: 'x' } });
  const { fixture, deleted } = setup(aDeckSummary({ status: 'draft' }), { delete: vi.fn().mockRejectedValue(refused) });
  click(fixture, 'Excluir deck');
  queryAll(fixture, 'app-confirm-dialog button').find((button) => button.textContent?.trim() === 'Excluir deck')?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Descontinue o deck') === true;
  });
  expect(deleted).not.toHaveBeenCalled();
});

it('CA-19 — excluir um deck sem inscritos emite deleted', async () => {
  const remove = vi.fn().mockResolvedValue(undefined);
  const { fixture, deleted } = setup(aDeckSummary({ status: 'draft', version: 2 }), { delete: remove });
  click(fixture, 'Excluir deck');
  queryAll(fixture, 'app-confirm-dialog button').find((button) => button.textContent?.trim() === 'Excluir deck')?.click();
  await waitFor(() => deleted.mock.calls.length > 0);
  expect(remove).toHaveBeenCalledWith('d1', 2);
});

it('CA-17 — cancelar a confirmação não chama a API', () => {
  const changeStatus = vi.fn();
  const { fixture } = setup(aDeckSummary({ status: 'published' }), { changeStatus });
  click(fixture, 'Descontinuar');
  click(fixture, 'Cancelar');
  expect(changeStatus).not.toHaveBeenCalled();
});

it('CA-04 — sem rede os botões de transição ficam desabilitados', () => {
  const { fixture } = setup(aDeckSummary({ status: 'published' }), {}, false);
  expect((queryAll(fixture, 'button')[0] as HTMLButtonElement).disabled).toBe(true);
});

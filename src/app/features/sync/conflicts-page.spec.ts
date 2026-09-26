import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { afterEach, expect, it, vi } from 'vitest';
import type { ConflictDetail } from '../../core/api/sync.model';
import { CardsData } from '../../core/data/cards-data';
import { DecksData } from '../../core/data/decks-data';
import type { ConflictCacheRow } from '../../core/db/account-db.model';
import { ConflictCache, ConflictExpiredError } from '../../core/sync/conflict-cache';
import { ConflictRestoreWriter } from '../../core/sync/conflict-restore-writer';
import type { SyncStatusDetails } from '../../core/sync/sync-status.model';
import { SyncStatusStore } from '../../core/sync/sync-status-store';
import { queryAll, rootText } from '../../testing/dom-testing';
import { ConflictsPage } from './conflicts-page';

const DETAIL: ConflictDetail = {
  id: 'k1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'concurrent_update',
  losingSnapshot: { front: 'Versão A', back: 'Verso' }, winningSnapshot: { front: 'Versão B', back: 'Verso' },
  currentVersion: 2, currentDeleted: false, expiresAt: '2099-01-01T12:00:00Z', restoredAt: null,
};
const ROW: ConflictCacheRow = { id: 'k1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'concurrent_update', expiresAt: '2099-01-01T12:00:00Z', detail: null };
let rows: WritableSignal<readonly ConflictCacheRow[]>;
let details: WritableSignal<SyncStatusDetails>;
const loadDetail = vi.fn();
const writer = { execute: vi.fn(), isSynced: vi.fn() };
function render(initial: readonly ConflictCacheRow[]): ComponentFixture<ConflictsPage> {
  rows = signal(initial);
  details = signal({ pendingCount: 1, actionRequiredCount: 0, reviewPendingCount: 0, oldestPendingAt: null, lastSyncAt: '', availableConflictCount: 1, actionsRequired: [], notices: [] });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ConflictCache, useValue: { all: rows, isLoading: () => false, loadDetail } },
      { provide: DecksData, useValue: { active: signal([]) } },
      { provide: CardsData, useValue: { allActive: signal([{ id: 'c1', deckId: 'd1', front: 'Versão B' }]) } },
      { provide: ConflictRestoreWriter, useValue: writer },
      { provide: SyncStatusStore, useValue: { details } },
    ],
  });
  const fixture = TestBed.createComponent(ConflictsPage);
  fixture.detectChanges();
  return fixture;
}
function button(fixture: ComponentFixture<ConflictsPage>, label: string): HTMLButtonElement {
  const found = queryAll(fixture, 'button').find((element) => element.textContent?.trim() === label);
  if (found === undefined) throw new Error(`botão "${label}" não encontrado`);
  return found as HTMLButtonElement;
}
async function settle(fixture: ComponentFixture<ConflictsPage>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}
async function openCompare(fixture: ComponentFixture<ConflictsPage>): Promise<void> {
  loadDetail.mockImplementationOnce(() => {
    rows.set([{ ...ROW, detail: DETAIL }]);
    return Promise.resolve(DETAIL);
  });
  button(fixture, 'Comparar').click();
  await settle(fixture);
}
afterEach(() => {
  loadDetail.mockReset();
  writer.execute.mockReset();
  writer.isSynced.mockReset();
});

it('RF6.4 — lista vazia explica que não há versões guardadas', () => {
  expect(rootText(render([]))).toContain('Nenhuma versão guardada para revisar.');
});

it('CA-20 — versão já restaurada continua registrada, sem ação de restaurar', () => {
  const fixture = render([{ ...ROW, restoredAt: '2026-09-26T12:00:00Z' }]);
  expect(rootText(fixture)).toContain('Restaurada em 26/09/2026');
  expect(queryAll(fixture, 'button')).toHaveLength(0);
});

it('CA-21 — versão com prazo encerrado mostra a data-limite e não oferece comparar nem restaurar', () => {
  const fixture = render([{ ...ROW, expiresAt: '2020-01-01T12:00:00Z' }]);
  expect(rootText(fixture)).toContain('Prazo encerrado em 01/01/2020');
  expect(queryAll(fixture, 'button')).toHaveLength(0);
});

it('CA-29 — comparar mostra as versões; fechar a comparação devolve o foco ao botão que a abriu', async () => {
  const fixture = render([ROW]);
  expect(rootText(fixture)).toContain('Pode ser restaurada até 01/01/2099');
  await openCompare(fixture);
  expect(rootText(fixture)).toContain('Versão A');
  button(fixture, 'Fechar comparação').click();
  await settle(fixture);
  expect(document.activeElement?.textContent?.trim()).toBe('Comparar');
});

it('CA-20 — restaurar confirma o salvamento local com foco e depois confirma a sincronização', async () => {
  writer.execute.mockResolvedValue({ entityType: 'card', entityId: 'c1', operationId: 'op-r' });
  writer.isSynced.mockResolvedValueOnce(false).mockResolvedValue(true);
  const fixture = render([ROW]);
  await openCompare(fixture);
  button(fixture, 'Restaurar versão guardada').click();
  await settle(fixture);
  button(fixture, 'Restaurar localmente').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('Versão restaurada e salva neste dispositivo.');
  expect(document.activeElement?.getAttribute('role')).toBe('status');
  details.update((current) => ({ ...current, pendingCount: 0 }));
  await settle(fixture);
  await settle(fixture);
  expect(rootText(fixture)).toContain('Versão restaurada e sincronizada.');
});

it('CA-29 — cancelar a restauração devolve o foco; falha ao restaurar ou carregar vira mensagem', async () => {
  writer.execute.mockRejectedValueOnce(new Error('Escolha um deck próprio para restaurar esse cartão.')).mockRejectedValueOnce('x');
  const fixture = render([ROW]);
  await openCompare(fixture);
  button(fixture, 'Restaurar versão guardada').click();
  await settle(fixture);
  button(fixture, 'Cancelar').click();
  await settle(fixture);
  expect(document.activeElement?.textContent?.trim()).toBe('Restaurar versão guardada');
  button(fixture, 'Restaurar versão guardada').click();
  await settle(fixture);
  button(fixture, 'Restaurar localmente').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('Escolha um deck próprio');
  button(fixture, 'Restaurar localmente').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('Não foi possível restaurar esta versão.');
  button(fixture, 'Fechar comparação').click();
  await settle(fixture);
  loadDetail.mockRejectedValueOnce(new ConflictExpiredError()).mockRejectedValueOnce(new Error('rede'));
  button(fixture, 'Comparar').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('o prazo de 30 dias já passou');
  button(fixture, 'Comparar').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('Não foi possível carregar esta versão agora.');
});

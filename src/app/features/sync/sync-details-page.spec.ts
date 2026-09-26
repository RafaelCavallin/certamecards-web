import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { ConnectivityStore } from '../../core/connectivity/connectivity-store';
import { SyncActionResolver } from '../../core/sync/sync-action-resolver';
import { SyncCycleCoordinator } from '../../core/sync/sync-cycle-coordinator';
import type { SyncStatusDetails } from '../../core/sync/sync-status.model';
import { SyncStatusStore } from '../../core/sync/sync-status-store';
import { queryAll, rootText } from '../../testing/dom-testing';
import { SyncDetailsPage } from './sync-details-page';

const EMPTY: SyncStatusDetails = { pendingCount: 0, actionRequiredCount: 0, reviewPendingCount: 0, oldestPendingAt: null, lastSyncAt: '', availableConflictCount: 0, actionsRequired: [], notices: [] };
const retryNow = vi.fn();
function render(details: SyncStatusDetails, online: boolean): ComponentFixture<SyncDetailsPage> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ConnectivityStore, useValue: { online: signal(online) } },
      { provide: SyncCycleCoordinator, useValue: { retryNow } },
      { provide: SyncActionResolver, useValue: {} },
      { provide: SyncStatusStore, useValue: { details: signal(details), status: signal(online ? 'pending' : 'offline'), pendingCount: signal(details.pendingCount) } },
    ],
  });
  const fixture = TestBed.createComponent(SyncDetailsPage);
  fixture.detectChanges();
  return fixture;
}
function buttonLabels(fixture: ComponentFixture<SyncDetailsPage>): readonly string[] {
  return queryAll(fixture, 'button').map((element) => element.textContent?.trim() ?? '');
}

it('CA-28 — sem conexão explica a situação, conta pendências no plural certo e não oferece tentar novamente', () => {
  const fixture = render({ ...EMPTY, pendingCount: 2, oldestPendingAt: '2026-09-26T15:18:00Z', lastSyncAt: '2026-09-26T15:00:00Z' }, false);
  const text = rootText(fixture) ?? '';
  expect(text).toContain('Você está sem conexão.');
  expect(text).toContain('2 alterações aguardando envio');
  expect(text).toContain('Nenhuma alteração precisa da sua atenção');
  expect(text).toMatch(/Alteração pendente mais antiga: 26\/09\/2026, \d{2}:18/);
  expect(text).toMatch(/Última sincronização concluída: 26\/09\/2026/);
  expect(buttonLabels(fixture)).not.toContain('Tentar novamente');
});

it('CA-28 — online com pendências oferece tentar novamente; erros e avisos ganham seções próprias', () => {
  const fixture = render({
    ...EMPTY, pendingCount: 1, actionRequiredCount: 1,
    actionsRequired: [{ operationId: 'op-1', kind: 'card_update', code: 'validation_failed', kindLabel: 'Editar cartão', subject: 'Frente', copyText: 'Frente', knownCardCount: null }],
    notices: [{ operationId: 'op-2', kindLabel: 'Suspender ou reativar cartão', subject: 'Pergunta oficial' }],
  }, true);
  const text = rootText(fixture) ?? '';
  expect(text).toContain('1 alteração aguardando envio');
  expect(text).toContain('1 alteração precisa da sua atenção');
  expect(text).toContain('Alterações que precisam da sua atenção');
  expect(text).toContain('Editar cartão: Frente');
  expect(text).toContain('Alterações que não se aplicam mais');
  expect(text).toContain('a ação não se aplica mais. Seu histórico de estudo foi mantido.');
  const retry = queryAll(fixture, 'button').find((element) => element.textContent?.trim() === 'Tentar novamente');
  retry?.click();
  expect(retryNow).toHaveBeenCalledOnce();
});

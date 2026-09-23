import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import type { ChangesPage } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import { AuthStore } from '../auth/auth-store';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { LocalDb } from '../db/local-db';
import { SyncService } from './sync-service';

let db: LocalDb;

function emptyPage(overrides: Partial<ChangesPage> = {}): ChangesPage {
  return {
    subjects: [], decks: [], cards: [], cardStates: [], reviewLogs: [], reviewVoids: [], subscriptions: [],
    settings: null, nextCursor: 0, hasMore: false, ...overrides,
  };
}
function setup(changesImpl: ReturnType<typeof vi.fn>, online = true, authenticated = true): SyncService {
  TestBed.configureTestingModule({
    providers: [
      { provide: SyncApi, useValue: { changes: changesImpl } },
      { provide: ConnectivityStore, useValue: { online: () => online } },
      { provide: AuthStore, useValue: { isAuthenticated: () => authenticated } },
    ],
  });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(SyncService);
}

afterEach(async () => {
  await db.delete();
});

it('TI-26 — 410 força resync completo preservando a fila de sincronização', async () => {
  const resyncError = new HttpErrorResponse({
    status: 410,
    error: { code: 'resync_required', title: 'Ressincronização', detail: 'x', status: 410, type: 'x' },
  });
  const changes = vi.fn().mockRejectedValueOnce(resyncError).mockResolvedValueOnce(emptyPage({ nextCursor: 0 }));
  const syncService = setup(changes);
  await db.outbox.add({
    kind: 'void',
    reviewId: 'r1',
    voidedAt: '2026-09-17T00:00:00Z',
    cardId: 'c1',
    state: {
      cardId: 'c1', state: 1, stability: 1, difficulty: 5, due: '2026-09-18T00:00:00Z',
      lastReview: '2026-09-17T00:00:00Z', reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 0,
      reviewCount: 1, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 0,
    },
  });
  await db.setCursor(500);
  await syncService.pull();
  expect(await db.getCursor()).toBe(0);
  expect(await db.outbox.count()).toBe(1);
});

it('TU-22 — pull não chama a API quando está offline', async () => {
  const changes = vi.fn();
  const syncService = setup(changes, false);
  await syncService.pull();
  expect(changes).not.toHaveBeenCalled();
});

it('TU — pull não chama a API quando não há sessão autenticada', async () => {
  const changes = vi.fn();
  const syncService = setup(changes, true, false);
  await syncService.pull();
  expect(changes).not.toHaveBeenCalled();
});

it('TU — pull propaga erros que não são resync_required', async () => {
  const changes = vi.fn().mockRejectedValue(new Error('falha de rede'));
  const syncService = setup(changes);
  await expect(syncService.pull()).rejects.toThrow('falha de rede');
});

it('TU — pull pagina até hasMore ser falso', async () => {
  const changes = vi
    .fn()
    .mockResolvedValueOnce(emptyPage({ nextCursor: 1, hasMore: true }))
    .mockResolvedValueOnce(emptyPage({ nextCursor: 2, hasMore: false }));
  const syncService = setup(changes);
  await syncService.pull();
  expect(changes).toHaveBeenCalledTimes(2);
  expect(await db.getCursor()).toBe(2);
});

import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { SyncApi } from '../api/sync-api';
import { AuthStore } from '../auth/auth-store';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { EventsService } from '../events/events-service';
import { OutboxFlusher } from './outbox-flusher';
import { StaleResolver } from './stale-resolver';
import { SyncService } from './sync-service';
import { SyncStatusStore } from './sync-status-store';

function setup(options: { online?: boolean; authenticated?: boolean; pendingCount?: number } = {}): {
  syncService: SyncService;
  flusher: { flushAll: ReturnType<typeof vi.fn> };
  staleResolver: { resolve: ReturnType<typeof vi.fn> };
  record: ReturnType<typeof vi.fn>;
} {
  const flusher = { flushAll: vi.fn().mockResolvedValue([]) };
  const staleResolver = { resolve: vi.fn().mockResolvedValue(undefined) };
  const record = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: SyncApi, useValue: { changes: vi.fn() } },
      { provide: ConnectivityStore, useValue: { online: () => options.online ?? true } },
      { provide: AuthStore, useValue: { isAuthenticated: () => options.authenticated ?? true } },
      { provide: OutboxFlusher, useValue: flusher },
      { provide: StaleResolver, useValue: staleResolver },
      { provide: EventsService, useValue: { record } },
      {
        provide: SyncStatusStore,
        useValue: { pendingCount: () => options.pendingCount ?? 0, status: () => 'synced', reportError: vi.fn() },
      },
    ],
  });
  return { syncService: TestBed.inject(SyncService), flusher, staleResolver, record };
}

it('TI-23 — flush envia a fila pendente e atualiza pendingCount', async () => {
  const { syncService, flusher } = setup();
  flusher.flushAll.mockResolvedValueOnce([]);
  await syncService.flush();
  expect(flusher.flushAll).toHaveBeenCalled();
});

it('TU — flush não chama a API quando está offline', async () => {
  const { syncService, flusher } = setup({ online: false });
  await syncService.flush();
  expect(flusher.flushAll).not.toHaveBeenCalled();
});

it('TU — flush não chama a API quando não há sessão autenticada', async () => {
  const { syncService, flusher } = setup({ authenticated: false });
  await syncService.flush();
  expect(flusher.flushAll).not.toHaveBeenCalled();
});

it('TI-24 — flush aciona a resolução de stale e reenvia', async () => {
  const { syncService, flusher, staleResolver } = setup();
  flusher.flushAll.mockResolvedValueOnce(['c1']).mockResolvedValueOnce([]);
  await syncService.flush();
  expect(staleResolver.resolve).toHaveBeenCalledWith(['c1']);
  expect(flusher.flushAll).toHaveBeenCalledTimes(2);
});

it('TU — flush registra sync_flushed quando havia itens pendentes', async () => {
  const { syncService, record } = setup({ pendingCount: 3 });
  await syncService.flush();
  expect(record).toHaveBeenCalledWith('sync_flushed', { itemCount: 3 });
});

it('TU — flush não registra sync_flushed quando não havia itens pendentes', async () => {
  const { syncService, record } = setup({ pendingCount: 0 });
  await syncService.flush();
  expect(record).not.toHaveBeenCalled();
});

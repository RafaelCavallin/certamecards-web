import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { LocalDb } from '../db/local-db';
import { SyncService } from '../sync/sync-service';
import { AuthStore } from './auth-store';
import { SignOutFlow } from './sign-out-flow';

function setup(pendingCount: number): {
  flow: SignOutFlow;
  authStore: { logout: ReturnType<typeof vi.fn> };
  syncService: { pendingCount: () => number; flush: ReturnType<typeof vi.fn> };
  localDb: { clearAllLocalData: ReturnType<typeof vi.fn> };
} {
  const authStore = { logout: vi.fn().mockResolvedValue(undefined) };
  const syncService = { pendingCount: () => pendingCount, flush: vi.fn().mockResolvedValue(undefined) };
  const localDb = { clearAllLocalData: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: authStore },
      { provide: SyncService, useValue: syncService },
      { provide: LocalDb, useValue: localDb },
    ],
  });
  return { flow: TestBed.inject(SignOutFlow), authStore, syncService, localDb };
}

it('TI-28 — sem pendências, sair não mostra aviso', () => {
  const { flow, authStore } = setup(0);
  flow.requestSignOut();
  expect(flow.confirmationOpen()).toBe(false);
  expect(authStore.logout).toHaveBeenCalledOnce();
});

it('TI-28 — com pendências, sair mostra o aviso', () => {
  const { flow, authStore } = setup(3);
  flow.requestSignOut();
  expect(flow.confirmationOpen()).toBe(true);
  expect(authStore.logout).not.toHaveBeenCalled();
});

it('TI-28 — "Aguardar" sincroniza antes de sair', async () => {
  const { flow, authStore, syncService } = setup(3);
  flow.requestSignOut();
  await flow.confirmWait();
  expect(syncService.flush).toHaveBeenCalledOnce();
  expect(authStore.logout).toHaveBeenCalledOnce();
  expect(flow.confirmationOpen()).toBe(false);
});

it('TI-28 — "Sair mesmo assim" apaga todas as tabelas locais', async () => {
  const { flow, authStore, localDb } = setup(3);
  flow.requestSignOut();
  await flow.confirmLeaveAnyway();
  expect(localDb.clearAllLocalData).toHaveBeenCalledOnce();
  expect(authStore.logout).toHaveBeenCalledOnce();
});

it('TI-28 — cancelar fecha o aviso sem sair', () => {
  const { flow, authStore } = setup(3);
  flow.requestSignOut();
  flow.cancel();
  expect(flow.confirmationOpen()).toBe(false);
  expect(authStore.logout).not.toHaveBeenCalled();
});

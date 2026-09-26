import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { SyncCycleCoordinator } from '../sync/sync-cycle-coordinator';
import { SyncStatusStore } from '../sync/sync-status-store';
import { AuthStore } from './auth-store';
import { SignOutFlow } from './sign-out-flow';

function setup(pendingCount: number, online = true): {
  flow: SignOutFlow;
  authStore: { logout: ReturnType<typeof vi.fn> };
  syncCycleCoordinator: { runNow: ReturnType<typeof vi.fn> };
} {
  const authStore = { logout: vi.fn().mockResolvedValue(undefined) };
  const state = { pendingCount };
  const syncStatusStore = { pendingCount: () => state.pendingCount };
  const syncCycleCoordinator = {
    runNow: vi.fn().mockImplementation(() => {
      state.pendingCount = 0;
      return Promise.resolve();
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: authStore },
      { provide: SyncStatusStore, useValue: syncStatusStore },
      { provide: SyncCycleCoordinator, useValue: syncCycleCoordinator },
      { provide: ConnectivityStore, useValue: { online: () => online } },
    ],
  });
  return { flow: TestBed.inject(SignOutFlow), authStore, syncCycleCoordinator };
}

it('TU-79 — sem pendências, sair não mostra aviso', async () => {
  const { flow, authStore } = setup(0);
  flow.requestSignOut();
  await Promise.resolve();
  expect(flow.dialog()).toBe('closed');
  expect(authStore.logout).toHaveBeenCalledOnce();
});

it('TU-79 — com pendências, sair mostra a escolha entre sincronizar e permanecer', () => {
  const { flow, authStore } = setup(3);
  flow.requestSignOut();
  expect(flow.dialog()).toBe('choice');
  expect(authStore.logout).not.toHaveBeenCalled();
});

it('TU-79 — "Sincronizar e sair" só apaga os dados depois de zerar a fila', async () => {
  const { flow, authStore, syncCycleCoordinator } = setup(3);
  flow.requestSignOut();
  await flow.syncAndSignOut();
  expect(syncCycleCoordinator.runNow).toHaveBeenCalledOnce();
  expect(authStore.logout).toHaveBeenCalledOnce();
  expect(flow.dialog()).toBe('closed');
});

it('TU-79 — sincronizar sem rede não conclui a saída e mantém o aviso', async () => {
  const { flow, authStore, syncCycleCoordinator } = setup(3, false);
  syncCycleCoordinator.runNow.mockResolvedValue(undefined);
  flow.requestSignOut();
  await flow.syncAndSignOut();
  expect(authStore.logout).not.toHaveBeenCalled();
  expect(flow.logoutFailed()).toBe(true);
});

it('TU-79 — descartar exige uma confirmação adicional antes de sair', async () => {
  const { flow, authStore } = setup(3);
  flow.requestSignOut();
  flow.requestDiscard();
  expect(flow.dialog()).toBe('discardConfirm');
  expect(authStore.logout).not.toHaveBeenCalled();
  await flow.confirmDiscard();
  expect(authStore.logout).toHaveBeenCalledOnce();
  expect(flow.dialog()).toBe('closed');
});

it('TU-79 — voltar do descarte devolve à escolha entre sincronizar e permanecer', () => {
  const { flow } = setup(3);
  flow.requestSignOut();
  flow.requestDiscard();
  flow.backToChoice();
  expect(flow.dialog()).toBe('choice');
});

it('TU-79 — permanecer na conta fecha o aviso sem sair', () => {
  const { flow, authStore } = setup(3);
  flow.requestSignOut();
  flow.stay();
  expect(flow.dialog()).toBe('closed');
  expect(authStore.logout).not.toHaveBeenCalled();
});

it('TU-79 — falha ao concluir a saída mantém a sessão recuperável', async () => {
  const { flow, authStore } = setup(0);
  authStore.logout.mockRejectedValue(new Error('network'));
  flow.requestSignOut();
  await Promise.resolve();
  await Promise.resolve();
  expect(flow.logoutFailed()).toBe(true);
});

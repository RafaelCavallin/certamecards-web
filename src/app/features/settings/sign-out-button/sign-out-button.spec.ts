import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { AuthStore } from '../../../core/auth/auth-store';
import { SyncCycleCoordinator } from '../../../core/sync/sync-cycle-coordinator';
import { SyncStatusStore } from '../../../core/sync/sync-status-store';
import { clickElement, queryAll, queryElement, rootText } from '../../../testing/dom-testing';
import { SignOutButton } from './sign-out-button';

function setup(pendingCount: number, online = true): {
  fixture: ReturnType<typeof TestBed.createComponent<SignOutButton>>;
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
  const fixture = TestBed.createComponent(SignOutButton);
  return { fixture, authStore, syncCycleCoordinator };
}

it('TU — sem pendências, clicar em Sair encerra a sessão direto', () => {
  const { fixture, authStore } = setup(0);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  expect(authStore.logout).toHaveBeenCalledOnce();
});

it('TU-79 — com pendências, clicar em Sair abre a escolha entre sincronizar e permanecer', () => {
  const { fixture, authStore } = setup(3);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const dialog = queryElement(fixture, 'dialog') as HTMLDialogElement | null;
  expect(dialog?.open).toBe(true);
  expect(authStore.logout).not.toHaveBeenCalled();
});

it('TU-79 — "Sincronizar e sair" sincroniza e então encerra a sessão', async () => {
  const { fixture, authStore, syncCycleCoordinator } = setup(3);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const buttons = queryAll(fixture, 'dialog button');
  buttons[2]?.click();
  await Promise.resolve();
  await Promise.resolve();
  expect(syncCycleCoordinator.runNow).toHaveBeenCalledOnce();
  expect(authStore.logout).toHaveBeenCalledOnce();
});

it('TU-79 — "Sair sem sincronizar" exige confirmar o descarte antes de encerrar a sessão', async () => {
  const { fixture, authStore } = setup(3);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const choiceButtons = queryAll(fixture, 'dialog button');
  choiceButtons[1]?.click();
  fixture.detectChanges();
  expect(authStore.logout).not.toHaveBeenCalled();
  const discardButtons = queryAll(fixture, 'dialog button');
  discardButtons[1]?.click();
  await Promise.resolve();
  await Promise.resolve();
  expect(authStore.logout).toHaveBeenCalledOnce();
});

it('TU-79 — "Permanecer na conta" fecha o aviso sem sair', () => {
  const { fixture, authStore } = setup(3);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const dialog = queryElement(fixture, 'dialog') as HTMLDialogElement | null;
  const stayButton = queryAll(fixture, 'dialog button').at(0) as HTMLButtonElement | undefined;
  stayButton?.click();
  fixture.detectChanges();
  expect(dialog?.open).toBe(false);
  expect(authStore.logout).not.toHaveBeenCalled();
});

it('TU-79 — "Voltar" no descarte devolve à escolha inicial', () => {
  const { fixture, authStore } = setup(3);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  queryAll(fixture, 'dialog button').at(1)?.click();
  fixture.detectChanges();
  const backButton = queryAll(fixture, 'dialog button').at(0) as HTMLButtonElement | undefined;
  backButton?.click();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Sincronizar e sair');
  expect(authStore.logout).not.toHaveBeenCalled();
});

it('TU-79 — sem rede, o botão de sincronizar e sair fica desabilitado com o motivo visível', () => {
  const { fixture } = setup(3, false);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const syncButton = queryAll(fixture, 'dialog button').at(2) as HTMLButtonElement | undefined;
  expect(syncButton?.disabled).toBe(true);
  expect(rootText(fixture)).toContain('recomendado é permanecer na conta');
});

it('TU-79 — falha ao sincronizar mostra o aviso sem fechar o diálogo', async () => {
  const { fixture, syncCycleCoordinator } = setup(3);
  syncCycleCoordinator.runNow.mockResolvedValue(undefined);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const syncButton = queryAll(fixture, 'dialog button').at(2) as HTMLButtonElement | undefined;
  syncButton?.click();
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Não foi possível concluir a saída');
});

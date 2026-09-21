import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store';
import { LocalDb } from '../../../core/db/local-db';
import { SyncService } from '../../../core/sync/sync-service';
import { clickElement, queryAll, queryElement } from '../../../testing/dom-testing';
import { SignOutButton } from './sign-out-button';

function setup(pendingCount: number): {
  fixture: ReturnType<typeof TestBed.createComponent<SignOutButton>>;
  authStore: { logout: ReturnType<typeof vi.fn> };
  localDb: { clearAllLocalData: ReturnType<typeof vi.fn> };
} {
  const authStore = { logout: vi.fn().mockResolvedValue(undefined) };
  const localDb = { clearAllLocalData: vi.fn().mockResolvedValue(undefined) };
  const syncService = { pendingCount: () => pendingCount, flush: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: authStore },
      { provide: LocalDb, useValue: localDb },
      { provide: SyncService, useValue: syncService },
    ],
  });
  const fixture = TestBed.createComponent(SignOutButton);
  return { fixture, authStore, localDb };
}

it('TU — sem pendências, clicar em Sair encerra a sessão direto', () => {
  const { fixture, authStore } = setup(0);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  expect(authStore.logout).toHaveBeenCalledOnce();
});

it('TI-28 — com pendências, clicar em Sair abre o aviso', () => {
  const { fixture, authStore } = setup(3);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const dialog = queryElement(fixture, 'dialog') as HTMLDialogElement | null;
  expect(dialog?.open).toBe(true);
  expect(authStore.logout).not.toHaveBeenCalled();
});

it('TI-28 — "Sair mesmo assim" apaga as tabelas locais e encerra a sessão', async () => {
  const { fixture, authStore, localDb } = setup(3);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  fixture.detectChanges();
  const buttons = queryAll(fixture, 'dialog button');
  buttons[1]?.click();
  await Promise.resolve();
  await Promise.resolve();
  expect(localDb.clearAllLocalData).toHaveBeenCalledOnce();
  expect(authStore.logout).toHaveBeenCalledOnce();
});

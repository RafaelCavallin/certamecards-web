import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { AuthStore } from '../auth/auth-store';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { GlobalPullRunner } from './global-pull-runner';
import { MutationFlusher } from './mutation-flusher';
import { ResyncRunner } from './resync-runner';
import { ReviewFlusher } from './review-flusher';
import { StaleResolver } from './stale-resolver';
import { SyncCycleCoordinator } from './sync-cycle-coordinator';
import { SyncStatusStore } from './sync-status-store';

let dbA: AccountDb;
let dbB: AccountDb;

afterEach(async () => {
  await dbA?.delete();
  await dbB?.delete();
});

it('TI-78 — trocar de conta durante um ciclo aborta antes de consultar ou enviar a fila da conta anterior', async () => {
  dbA = new AccountDb('account-isolation-a');
  dbB = new AccountDb('account-isolation-b');
  const reviewFlusher = { flush: vi.fn().mockResolvedValue({ staleCardIds: [] }) };
  const pullRunner = { pull: vi.fn().mockResolvedValue(undefined) };
  const accountRef: { current: CurrentAccountDb | null } = { current: null };
  const mutationFlusher = {
    flush: vi.fn().mockImplementation(() => {
      accountRef.current?.set({ db: dbB, userId: 'user-b' });
      return Promise.resolve({ authRequired: false });
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: ConnectivityStore, useValue: { online: () => true } },
      { provide: AuthStore, useValue: { isAuthenticated: () => true } },
      { provide: MutationFlusher, useValue: mutationFlusher },
      { provide: ReviewFlusher, useValue: reviewFlusher },
      { provide: GlobalPullRunner, useValue: pullRunner },
      { provide: StaleResolver, useValue: { resolve: vi.fn() } },
      { provide: ResyncRunner, useValue: { resync: vi.fn() } },
    ],
  });
  accountRef.current = TestBed.inject(CurrentAccountDb);
  accountRef.current.set({ db: dbA, userId: 'user-a' });
  const statusStore = TestBed.inject(SyncStatusStore);
  const reportErrorSpy = vi.spyOn(statusStore, 'reportError');
  const coordinator = TestBed.inject(SyncCycleCoordinator);
  coordinator.requestSync();
  await waitFor(() => mutationFlusher.flush.mock.calls.length > 0);
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(mutationFlusher.flush).toHaveBeenNthCalledWith(1, dbA, expect.any(String));
  expect(reviewFlusher.flush).not.toHaveBeenCalledWith(dbA, expect.any(String));
  expect(pullRunner.pull).not.toHaveBeenCalledWith(dbA, expect.any(String));
  expect(reportErrorSpy.mock.calls[0]).toEqual([false]);
  coordinator.ngOnDestroy();
});

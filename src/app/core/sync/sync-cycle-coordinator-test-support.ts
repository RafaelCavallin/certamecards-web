import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
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

export interface Mocks {
  mutationFlusher: { flush: ReturnType<typeof vi.fn> };
  reviewFlusher: { flush: ReturnType<typeof vi.fn> };
  pullRunner: { pull: ReturnType<typeof vi.fn> };
  staleResolver: { resolve: ReturnType<typeof vi.fn> };
  resyncRunner: { resync: ReturnType<typeof vi.fn> };
}
export function baseMocks(order: string[]): Mocks {
  return {
    mutationFlusher: {
      flush: vi.fn().mockImplementation(() => {
        order.push('mutation');
        return Promise.resolve({ authRequired: false });
      }),
    },
    reviewFlusher: {
      flush: vi.fn().mockImplementation(() => {
        order.push('review');
        return Promise.resolve({ staleCardIds: [] });
      }),
    },
    pullRunner: {
      pull: vi.fn().mockImplementation(() => {
        order.push('pull');
        return Promise.resolve();
      }),
    },
    staleResolver: { resolve: vi.fn().mockResolvedValue(undefined) },
    resyncRunner: { resync: vi.fn().mockResolvedValue(undefined) },
  };
}
let activeCoordinator: SyncCycleCoordinator | null = null;
export async function teardownCoordinator(db: AccountDb): Promise<void> {
  activeCoordinator?.ngOnDestroy();
  await activeCoordinator?.whenIdle();
  activeCoordinator = null;
  await db.delete();
}
export function setupCoordinator(mocks: Mocks, online = true): { coordinator: SyncCycleCoordinator; db: AccountDb } {
  TestBed.configureTestingModule({
    providers: [
      { provide: ConnectivityStore, useValue: { online: () => online } },
      { provide: AuthStore, useValue: { isAuthenticated: () => true } },
      { provide: MutationFlusher, useValue: mocks.mutationFlusher },
      { provide: ReviewFlusher, useValue: mocks.reviewFlusher },
      { provide: GlobalPullRunner, useValue: mocks.pullRunner },
      { provide: StaleResolver, useValue: mocks.staleResolver },
      { provide: ResyncRunner, useValue: mocks.resyncRunner },
    ],
  });
  const db = new AccountDb('sync-cycle-coordinator-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'u1' });
  activeCoordinator = TestBed.inject(SyncCycleCoordinator);
  return { coordinator: activeCoordinator, db };
}

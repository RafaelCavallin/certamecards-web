import { Injectable, type OnDestroy, inject } from '@angular/core';
import { AuthStore } from '../auth/auth-store';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import type { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { GlobalPullRunner } from './global-pull-runner';
import { MutationFlusher } from './mutation-flusher';
import { isResyncRequired, ResyncRunner } from './resync-runner';
import { ReviewFlusher } from './review-flusher';
import { StaleResolver } from './stale-resolver';
import { withAccountLease } from './sync-lease-session';
import { SyncStatusStore } from './sync-status-store';
import { registerReactiveTriggers, registerSyncTriggers } from './sync-triggers';

class AccountSwitchedError extends Error {}
@Injectable({ providedIn: 'root' })
export class SyncCycleCoordinator implements OnDestroy {
  private readonly connectivity = inject(ConnectivityStore);
  private readonly authStore = inject(AuthStore);
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly mutationFlusher = inject(MutationFlusher);
  private readonly reviewFlusher = inject(ReviewFlusher);
  private readonly pullRunner = inject(GlobalPullRunner);
  private readonly staleResolver = inject(StaleResolver);
  private readonly resyncRunner = inject(ResyncRunner);
  private readonly statusStore = inject(SyncStatusStore);
  private readonly stopTriggers: () => void;
  private cycle: Promise<void> | null = null;
  private queued = false;
  private destroyed = false;

  constructor() {
    this.stopTriggers = registerSyncTriggers({
      onTrigger: () => this.requestSync(),
      onReconnect: () => this.retryNow(),
    });
    registerReactiveTriggers(
      { isAuthenticated: this.authStore.isAuthenticated, pendingCount: this.statusStore.pendingCount },
      () => this.requestSync(),
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopTriggers();
  }

  retryNow(): void {
    const account = this.currentAccountDb.current();
    if (account === null) {
      return;
    }
    void account.db.syncOperations
      .where('status')
      .equals('retry_wait')
      .modify({ retryAt: null })
      .then(() => this.requestSync());
  }

  requestSync(): void {
    if (!this.canSync()) {
      return;
    }
    if (this.cycle !== null) {
      this.queued = true;
      return;
    }
    this.cycle = this.runCycle().finally(() => this.onCycleSettled());
  }

  async runNow(): Promise<void> {
    if (this.cycle !== null) {
      await this.cycle;
    }
    if (!this.canSync()) {
      return;
    }
    const cycle = this.runCycle().finally(() => this.onCycleSettled());
    this.cycle = cycle;
    await cycle;
  }

  async whenIdle(): Promise<void> {
    while (this.cycle !== null) {
      await this.cycle;
    }
  }

  private onCycleSettled(): void {
    this.cycle = null;
    if (this.queued) {
      this.queued = false;
      this.requestSync();
    }
  }

  private canSync(): boolean {
    return !this.destroyed && this.connectivity.online() && this.authStore.isAuthenticated();
  }

  private async runCycle(): Promise<void> {
    const account = this.currentAccountDb.require();
    const deviceId = await this.currentAccountDb.deviceId();
    await withAccountLease(account.db, deviceId, () => this.runStepsSafely(account.db, account.userId, deviceId));
  }

  private async runStepsSafely(db: AccountDb, userId: string, deviceId: string): Promise<void> {
    this.statusStore.reportSyncing(true);
    try {
      await this.runSteps(db, userId, deviceId);
      this.statusStore.reportError(false);
    } catch (error) {
      this.statusStore.reportError(!(error instanceof AccountSwitchedError));
    } finally {
      this.statusStore.reportSyncing(false);
    }
  }

  private async runSteps(db: AccountDb, userId: string, deviceId: string): Promise<void> {
    this.ensureSameUser(userId);
    await this.mutationFlusher.flush(db, deviceId);
    this.ensureSameUser(userId);
    const reviewOutcome = await this.reviewFlusher.flush(db, deviceId);
    if (reviewOutcome.staleCardIds.length > 0) {
      await this.staleResolver.resolve(db, reviewOutcome.staleCardIds);
      await this.reviewFlusher.flush(db, deviceId);
    }
    this.ensureSameUser(userId);
    await this.pullWithResync(db, userId);
    await db.setLastSyncAt(new Date().toISOString());
  }

  private async pullWithResync(db: AccountDb, userId: string): Promise<void> {
    try {
      await this.pullRunner.pull(db, userId);
    } catch (error) {
      if (!isResyncRequired(error)) {
        throw error;
      }
      await this.resyncRunner.resync(db, userId);
    }
  }

  private ensureSameUser(userId: string): void {
    if (this.currentAccountDb.current()?.userId !== userId) {
      throw new AccountSwitchedError();
    }
  }
}

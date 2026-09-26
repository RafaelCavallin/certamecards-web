import { Injectable, computed, inject, Injector, signal } from '@angular/core';
import type { ReviewOutboxItem } from "../db/account-db.model";
import type { Signal } from '@angular/core';
import { accountLiveSignal } from '../data/account-live-query';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { CurrentAccountDb } from '../db/current-account-db';
import type { CurrentAccount } from '../db/current-account-db';
import type { SyncStatus, SyncStatusDetails } from './sync-status.model';
import { buildActionsRequired, buildNotices, isActionRequired } from './sync-action-details';

function reviewPendingAt(review: ReviewOutboxItem): string {
  if (review.kind === 'review') {
    return review.log.reviewedAt;
  }
  return review.kind === 'void' ? review.voidedAt : '';
}
const EMPTY_DETAILS: SyncStatusDetails = { pendingCount: 0, actionRequiredCount: 0, reviewPendingCount: 0, oldestPendingAt: null, lastSyncAt: '', availableConflictCount: 0, actionsRequired: [], notices: [] };
async function loadDetails(account: CurrentAccount): Promise<SyncStatusDetails> {
  const operations = await account.db.syncOperations.toArray();
  const reviews = await account.db.reviewOutbox.where('status').anyOf(['pending', 'sending']).toArray();
  const conflicts = await account.db.conflicts.toArray();
  const unsynced = operations.filter((operation) => operation.status !== 'synced');
  const pending = unsynced.filter((operation) => !isActionRequired(operation));
  const actionsRequired = await buildActionsRequired(account.db, unsynced);
  const notices = await buildNotices(account.db, operations);
  const dates = [...pending.map((operation) => operation.occurredAt), ...reviews.map(reviewPendingAt)];
  const meta = await account.db.meta.get('lastSyncAt');
  const now = new Date().toISOString();
  return { pendingCount: pending.length + reviews.length, actionRequiredCount: unsynced.length - pending.length, reviewPendingCount: reviews.length, oldestPendingAt: dates.sort().at(0) ?? null, lastSyncAt: typeof meta?.value === 'string' ? meta.value : '', availableConflictCount: conflicts.filter((conflict) => conflict.expiresAt > now && (conflict.restoredAt ?? null) === null).length, actionsRequired, notices };
}
@Injectable({ providedIn: 'root' })
export class SyncStatusStore {
  private readonly connectivity = inject(ConnectivityStore);
  private readonly hasErrorSignal = signal(false);
  private readonly syncingSignal = signal(false);

  readonly details: Signal<SyncStatusDetails> = accountLiveSignal(inject(Injector), inject(CurrentAccountDb), {
    query: loadDetails,
    initialValue: EMPTY_DETAILS,
  });
  readonly pendingCount = computed(() => this.details().pendingCount);

  readonly status: Signal<SyncStatus> = computed(() => this.computeStatus());

  reportError(hasError: boolean): void {
    this.hasErrorSignal.set(hasError);
  }

  reportSyncing(syncing: boolean): void {
    this.syncingSignal.set(syncing);
  }

  private computeStatus(): SyncStatus {
    if (this.hasErrorSignal() || this.details().actionRequiredCount > 0) {
      return 'error';
    }
    if (!this.connectivity.online()) {
      return 'offline';
    }
    if (this.syncingSignal()) {
      return 'syncing';
    }
    return this.pendingCount() > 0 ? 'pending' : 'synced';
  }
}

import { Injectable, inject } from '@angular/core';
import { SyncApi } from '../api/sync-api';
import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { markOperationsSending, recoverOrphanedLeases, selectReadyOperations } from './operation-selector';
import { settleMutationResults } from './mutation-settler';
import { nextRetryAt } from './sync-backoff';
import type { ClassifiedError } from './sync-error-classifier';
import { classifySyncError } from './sync-error-classifier';
import { ITEM_LEASE_MS, MUTATION_BATCH_SIZE } from './sync-constants';
import { toOperationWire } from './sync-mutation-mapper';
import type { SyncOperationPayload } from './sync-operation-payload.model';

type Operation = SyncOperationRow<SyncOperationPayload>;
interface RevertContext {
  readonly classified: ClassifiedError;
  readonly nowMs: number;
}
export interface MutationFlushOutcome {
  readonly authRequired: boolean;
}
interface BatchOutcome {
  readonly batchSize: number;
  readonly authRequired: boolean;
}
@Injectable({ providedIn: 'root' })
export class MutationFlusher {
  private readonly syncApi = inject(SyncApi);

  async flush(db: AccountDb, deviceId: string): Promise<MutationFlushOutcome> {
    await recoverOrphanedLeases(db, Date.now());
    let authRequired = false;
    let hasMore = true;
    while (hasMore && !authRequired) {
      const outcome = await this.flushBatch(db, deviceId);
      ({ authRequired } = outcome);
      hasMore = outcome.batchSize >= MUTATION_BATCH_SIZE;
    }
    return { authRequired };
  }

  private async flushBatch(db: AccountDb, deviceId: string): Promise<BatchOutcome> {
    const nowMs = Date.now();
    const batch = await selectReadyOperations(db, nowMs, MUTATION_BATCH_SIZE);
    if (batch.length === 0) {
      return { batchSize: 0, authRequired: false };
    }
    await markOperationsSending(db, batch, new Date(nowMs + ITEM_LEASE_MS).toISOString());
    return this.sendBatch(db, deviceId, batch);
  }

  private async sendBatch(db: AccountDb, deviceId: string, batch: readonly Operation[]): Promise<BatchOutcome> {
    try {
      const response = await this.syncApi.mutate({ deviceId, operations: batch.map(toOperationWire) });
      await settleMutationResults(db, { operations: batch, results: response.results }, Date.now());
      return { batchSize: batch.length, authRequired: false };
    } catch (error) {
      const authRequired = await this.handleBatchFailure(db, batch, error);
      return { batchSize: batch.length, authRequired };
    }
  }

  private async handleBatchFailure(db: AccountDb, batch: readonly Operation[], error: unknown): Promise<boolean> {
    const classified = classifySyncError(error);
    const context: RevertContext = { classified, nowMs: Date.now() };
    for (const operation of batch) {
      await this.revertOperation(db, operation, context);
    }
    return classified.category === 'auth';
  }

  private async revertOperation(db: AccountDb, operation: Operation, context: RevertContext): Promise<void> {
    if (context.classified.category === 'auth') {
      await db.syncOperations.update(operation.operationId, { status: 'auth_required', leaseUntil: null });
      return;
    }
    if (context.classified.category === 'transient') {
      const retryAt = nextRetryAt(context.nowMs, {
        attempt: operation.attempts,
        retryAfterSeconds: context.classified.retryAfterSeconds,
      });
      await db.syncOperations.update(operation.operationId, { status: 'retry_wait', leaseUntil: null, retryAt });
      return;
    }
    await db.syncOperations.update(operation.operationId, { status: 'action_required', leaseUntil: null });
  }
}

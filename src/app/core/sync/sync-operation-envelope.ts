import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { generateUuidV7 } from '../db/uuid7';
import { HybridLogicalClock } from './hybrid-logical-clock';
import type { SyncOperationKind } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

export interface EnvelopeContext {
  readonly db: AccountDb;
  readonly userId: string;
  readonly deviceId: string;
}
export interface OperationDraft<TPayload extends SyncOperationPayload> {
  readonly kind: SyncOperationKind;
  readonly entityId: string;
  readonly parentId: string | null;
  readonly baseVersion: number | null;
  readonly predecessorOperationId: string | null;
  readonly dependsOn: readonly string[];
  readonly payload: TPayload;
}
export async function buildOperationEnvelope<TPayload extends SyncOperationPayload>(
  context: EnvelopeContext,
  draft: OperationDraft<TPayload>,
): Promise<SyncOperationRow<TPayload>> {
  const clock = new HybridLogicalClock(context.db);
  const nowMs = Date.now();
  const observedServerTime = await context.db.getServerTime();
  const clockState = await clock.advance(nowMs, observedServerTime);
  const deviceSequence = await clock.nextDeviceSequence();
  return {
    operationId: generateUuidV7(),
    accountId: context.userId,
    deviceId: context.deviceId,
    deviceSequence,
    kind: draft.kind,
    entityId: draft.entityId,
    parentId: draft.parentId,
    baseVersion: draft.baseVersion,
    predecessorOperationId: draft.predecessorOperationId,
    dependsOn: draft.dependsOn,
    occurredAt: new Date(nowMs).toISOString(),
    clock: clockState,
    observedServerTime,
    payload: draft.payload,
    status: 'pending',
    attempts: 0,
    retryAt: null,
    leaseUntil: null,
    error: null,
    syncedAt: null,
  };
}

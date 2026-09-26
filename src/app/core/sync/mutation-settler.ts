import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { applyRemoteBaseIfNewer } from './remote-base';
import type { MutationResult } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

type Operation = SyncOperationRow<SyncOperationPayload>;
interface SettleItem {
  readonly operation: Operation;
  readonly result: MutationResult;
}
export interface SettleBatch {
  readonly operations: readonly Operation[];
  readonly results: readonly MutationResult[];
}
function versionPatch(result: MutationResult): Record<string, number> {
  const patch: Record<string, number> = {};
  if (result.entityVersion !== null) {
    patch['version'] = result.entityVersion;
  }
  if (result.changeSeq !== null) {
    patch['changeSeq'] = result.changeSeq;
  }
  return patch;
}
async function applyRestoredEntityVersion(db: AccountDb, entityId: string, patch: Record<string, number>): Promise<void> {
  const deck = await db.decks.get(entityId);
  if (deck !== undefined) {
    await db.decks.update(entityId, patch);
    return;
  }
  await db.cards.update(entityId, patch);
}
async function applyEntityVersion(db: AccountDb, item: SettleItem): Promise<void> {
  const { operation, result } = item;
  if (result.entityVersion === null && result.changeSeq === null) {
    return;
  }
  if (operation.kind === 'deck_create' || operation.kind === 'deck_update') {
    await db.decks.update(operation.entityId, versionPatch(result));
    return;
  }
  if (operation.kind === 'card_create' || operation.kind === 'card_update') {
    await db.cards.update(operation.entityId, versionPatch(result));
    return;
  }
  if (operation.kind === 'conflict_restore') {
    await applyRestoredEntityVersion(db, operation.entityId, versionPatch(result));
    return;
  }
  if (operation.kind === 'card_suspension' && result.changeSeq !== null) {
    await db.cardStates.update(operation.entityId, { changeSeq: result.changeSeq });
    return;
  }
  if (operation.kind === 'settings_patch' && result.changeSeq !== null) {
    await db.settings.update(operation.entityId, { changeSeq: result.changeSeq });
  }
}
const NOT_APPLICABLE_ERROR_CODE = 'not_applicable';
function isNotApplicable(result: MutationResult): boolean {
  return result.outcome === 'action_required' && result.error?.code === NOT_APPLICABLE_ERROR_CODE;
}
async function settleOne(db: AccountDb, item: SettleItem, nowIso: string): Promise<void> {
  const { operation, result } = item;
  if (result.outcome === 'applied' || result.outcome === 'duplicate' || result.outcome === 'conflict') {
    await applyEntityVersion(db, item);
    await db.syncOperations.update(operation.operationId, { status: 'synced', syncedAt: nowIso, error: null });
    await applyRemoteBaseIfNewer(db, operation.entityId, result.changeSeq);
    return;
  }
  if (isNotApplicable(result)) {
    await db.syncOperations.update(operation.operationId, { status: 'synced', syncedAt: nowIso, error: result.error });
    return;
  }
  if (result.outcome === 'dependency_blocked') {
    await db.syncOperations.update(operation.operationId, { status: 'pending', error: null });
    return;
  }
  await db.syncOperations.update(operation.operationId, { status: 'action_required', error: result.error });
}
export async function settleMutationResults(db: AccountDb, batch: SettleBatch, nowMs: number): Promise<void> {
  const byId = new Map(batch.results.map((result) => [result.operationId, result]));
  const nowIso = new Date(nowMs).toISOString();
  for (const operation of batch.operations) {
    const result = byId.get(operation.operationId);
    if (result !== undefined) {
      await settleOne(db, { operation, result }, nowIso);
    }
  }
}

import { Injectable, inject } from '@angular/core';
import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { CurrentAccountDb } from '../db/current-account-db';
import { generateUuidV7 } from '../db/uuid7';
import { SyncCycleCoordinator } from './sync-cycle-coordinator';
import type { SyncOperationPayload } from './sync-operation-payload.model';

type Operation = SyncOperationRow<SyncOperationPayload>;
const LOCAL_ONLY_KINDS: ReadonlySet<string> = new Set(['card_create', 'deck_create', 'conflict_restore']);
function dependsOnAny(operation: Operation, ids: ReadonlySet<string>): boolean {
  const predecessor = operation.predecessorOperationId;
  return operation.dependsOn.some((id) => ids.has(id)) || (predecessor !== null && ids.has(predecessor));
}
function withDependents(all: readonly Operation[], rootId: string): readonly Operation[] {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    const added = all.filter((operation) => !ids.has(operation.operationId) && dependsOnAny(operation, ids));
    added.forEach((operation) => ids.add(operation.operationId));
    grew = added.length > 0;
  }
  return all.filter((operation) => ids.has(operation.operationId) && operation.status !== 'synced');
}
async function removeLocalOnlyEntity(db: AccountDb, operation: Operation): Promise<void> {
  if (operation.kind === 'deck_create') {
    await db.cards.where('deckId').equals(operation.entityId).delete();
    await db.decks.delete(operation.entityId);
    return;
  }
  if (operation.kind === 'conflict_restore') {
    await db.decks.delete(operation.entityId);
  }
  await db.cards.delete(operation.entityId);
  await db.cardStates.delete(operation.entityId);
}
async function remapDependents(db: AccountDb, previousId: string, renewedId: string): Promise<void> {
  const dependents = (await db.syncOperations.toArray()).filter((operation) => dependsOnAny(operation, new Set([previousId])));
  for (const dependent of dependents) {
    await db.syncOperations.update(dependent.operationId, {
      dependsOn: dependent.dependsOn.map((id) => (id === previousId ? renewedId : id)),
      predecessorOperationId: dependent.predecessorOperationId === previousId ? renewedId : dependent.predecessorOperationId,
    });
  }
}
@Injectable({ providedIn: 'root' })
export class SyncActionResolver {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly coordinator = inject(SyncCycleCoordinator);

  async affectedCount(operationId: string): Promise<number> {
    const {db} = this.currentAccountDb.require();
    return withDependents(await db.syncOperations.toArray(), operationId).length;
  }

  async retry(operationId: string): Promise<void> {
    const {db} = this.currentAccountDb.require();
    await db.transaction('rw', [db.syncOperations], async () => {
      const operation = await db.syncOperations.get(operationId);
      if (operation === undefined) {
        return;
      }
      const renewedId = generateUuidV7();
      await db.syncOperations.delete(operationId);
      await db.syncOperations.add({ ...operation, operationId: renewedId, status: 'pending', error: null, retryAt: null, attempts: 0 });
      await remapDependents(db, operationId, renewedId);
    });
    this.coordinator.retryNow();
  }

  async discard(operationId: string): Promise<void> {
    const {db} = this.currentAccountDb.require();
    const tables = [db.syncOperations, db.decks, db.cards, db.cardStates, db.meta];
    await db.transaction('rw', tables, async () => {
      const discarded = withDependents(await db.syncOperations.toArray(), operationId);
      for (const operation of discarded) {
        await db.syncOperations.delete(operation.operationId);
        if (LOCAL_ONLY_KINDS.has(operation.kind)) {
          await removeLocalOnlyEntity(db, operation);
        }
      }
      await db.setCursor(0);
    });
    this.coordinator.retryNow();
  }
}

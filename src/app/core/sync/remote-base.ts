import type { AccountDb } from '../db/account-db';
import type { RemoteBaseRow } from '../db/account-db.model';
import { toCardRow } from '../db/card-row';
import { CARD_WRITE_KINDS, DECK_WRITE_KINDS } from './operation-compactor';

export async function stashRemoteBase(db: AccountDb, base: RemoteBaseRow): Promise<void> {
  const current = await db.remoteBases.get(base.entityId);
  if (current !== undefined && current.changeSeq >= base.changeSeq) {
    return;
  }
  await db.remoteBases.put(base);
}
async function hasUnresolvedWrite(db: AccountDb, entityId: string): Promise<boolean> {
  const kinds = [...CARD_WRITE_KINDS, ...DECK_WRITE_KINDS];
  const count = await db.syncOperations
    .where('entityId')
    .equals(entityId)
    .filter((operation) => kinds.includes(operation.kind) && operation.status !== 'synced')
    .count();
  return count > 0;
}
async function applyBase(db: AccountDb, base: RemoteBaseRow): Promise<void> {
  if (base.entityType === 'deck') {
    await db.decks.put({ ...base.payload, changeSeq: base.changeSeq });
    return;
  }
  await db.cards.put(toCardRow({ ...base.payload, changeSeq: base.changeSeq }));
}
export async function applyRemoteBaseIfNewer(db: AccountDb, entityId: string, settledChangeSeq: number | null): Promise<void> {
  const base = await db.remoteBases.get(entityId);
  if (base === undefined || (await hasUnresolvedWrite(db, entityId))) {
    return;
  }
  await db.remoteBases.delete(entityId);
  if (base.changeSeq > (settledChangeSeq ?? 0)) {
    await applyBase(db, base);
  }
}
export async function discardRemoteBase(db: AccountDb, entityId: string): Promise<void> {
  await db.remoteBases.delete(entityId);
}

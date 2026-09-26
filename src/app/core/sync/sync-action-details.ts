import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { describeOperation } from './sync-operation-describer';
import type { SyncOperationPayload } from './sync-operation-payload.model';
import type { SyncActionRequired, SyncNotice } from './sync-status.model';

type Operation = SyncOperationRow<SyncOperationPayload>;
const USER_CARD_LIMIT = 'user_card_limit';
const DECK_CARD_LIMIT = 'deck_card_limit';
const NOT_APPLICABLE = 'not_applicable';
function limitDeckId(operation: Operation): string | null {
  const {payload} = operation;
  if (payload.kind === 'card_create' || payload.kind === 'card_update') {
    return payload.card.deckId;
  }
  return operation.parentId;
}
async function knownCardCount(db: AccountDb, operation: Operation, code: string): Promise<number | null> {
  if (code === USER_CARD_LIMIT) {
    return db.cards.filter((card) => card.deletedAt === null).count();
  }
  const deckId = limitDeckId(operation);
  if (code !== DECK_CARD_LIMIT || deckId === null) {
    return null;
  }
  return db.cards.where('deckId').equals(deckId).filter((card) => card.deletedAt === null).count();
}
export function isActionRequired(operation: Operation): boolean {
  return operation.status === 'action_required' || operation.status === 'auth_required';
}
export async function buildActionsRequired(db: AccountDb, operations: readonly Operation[]): Promise<readonly SyncActionRequired[]> {
  const actions = operations.filter(isActionRequired);
  return Promise.all(actions.map(async (operation) => {
    const code = operation.error?.code ?? operation.status;
    const description = await describeOperation(db, operation);
    return {
      operationId: operation.operationId, kind: operation.kind, code, ...description,
      knownCardCount: await knownCardCount(db, operation, code),
    };
  }));
}
export async function buildNotices(db: AccountDb, operations: readonly Operation[]): Promise<readonly SyncNotice[]> {
  const notices = operations.filter((operation) => operation.status === 'synced' && operation.error?.code === NOT_APPLICABLE);
  return Promise.all(notices.map(async (operation) => {
    const { kindLabel, subject } = await describeOperation(db, operation);
    return { operationId: operation.operationId, kindLabel, subject };
  }));
}

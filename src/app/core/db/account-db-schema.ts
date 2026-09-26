import type { StoreDefinitions } from './local-db-schema';

// active (subjects), deletedAt (decks/cards) e suspended (cardStates) são boolean/null:
// não são chaves válidas no IndexedDB e ficam de fora do índice, como em local-db-schema.ts.
// subscriptions usa só deckId: cada AccountDb já pertence a um único userId.
export const ACCOUNT_DB_STORES_V1: StoreDefinitions = {
  meta: 'key',
  subjects: 'id',
  decks: 'id, subjectId',
  cards: 'id, deckId, searchText',
  cardStates: 'cardId, due',
  deckResets: 'operationId, deckId, eventAt',
  reviewLogs: 'id, cardId, [eventAt+eventCounter]',
  reviewVoids: 'reviewId',
  syncOperations: 'operationId, status, retryAt, entityId, leaseUntil, deviceSequence',
  reviewOutbox: '++seq, kind, cardId, status, retryAt',
  settings: 'userId',
  profile: 'userId',
  subscriptions: 'deckId',
  conflicts: 'id, expiresAt, entityType, entityId',
  events: 'id, status, occurredAt',
};
// reviewedAt é adicionado ao índice de reviewLogs na v2 para as janelas do dia de estudo
// (StudySessionLoader), sem tocar nos dados existentes.
export const ACCOUNT_DB_STORES_V2: StoreDefinitions = {
  ...ACCOUNT_DB_STORES_V1,
  reviewLogs: 'id, cardId, reviewedAt, [eventAt+eventCounter]',
};
export const ACCOUNT_DB_STORES_V3: StoreDefinitions = {
  ...ACCOUNT_DB_STORES_V2,
  remoteBases: 'entityId',
};
export const ACCOUNT_DB_SCHEMA_VERSIONS: readonly StoreDefinitions[] = [ACCOUNT_DB_STORES_V1, ACCOUNT_DB_STORES_V2, ACCOUNT_DB_STORES_V3];

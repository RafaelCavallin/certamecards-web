type StoreDefinitions = Readonly<Record<string, string>>;
// boolean e null não são chaves válidas no IndexedDB: active, deletedAt e suspended
// ficam de fora do índice e são filtrados em memória por quem lê.
const STORES_V1: StoreDefinitions = {
  meta: 'key',
  subjects: 'id',
  decks: 'id, subjectId',
  cards: 'id, deckId',
  cardStates: 'cardId, due, state',
  reviewLogs: 'id, cardId, reviewedAt, [cardId+reviewedAt]',
  outbox: '++seq, kind',
  settings: 'userId',
};
const STORES_V2: StoreDefinitions = { ...STORES_V1, events: 'id, occurredAt' };
const STORES_V3: StoreDefinitions = { ...STORES_V2, subscriptions: 'deckId', errorReports: 'cardId' };
export const LOCAL_DB_SCHEMA_VERSIONS: readonly StoreDefinitions[] = [STORES_V1, STORES_V2, STORES_V3];

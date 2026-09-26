import Dexie from 'dexie';
import { afterEach, expect, it } from 'vitest';
import { LocalDb } from './local-db';

let db: LocalDb;

const SUBSCRIPTION = { deckId: 'd1', subscribedAt: '2026-09-19T00:00:00Z', cancelledAt: null, changeSeq: 1 };

afterEach(async () => {
  await db.delete();
});

it('TU — migração da v2 para a v3 preserva os dados locais e cria as tabelas novas', async () => {
  const legacy = new Dexie('certamecards');
  legacy.version(2).stores({
    meta: 'key', subjects: 'id', decks: 'id, subjectId', cards: 'id, deckId', cardStates: 'cardId, due, state',
    reviewLogs: 'id, cardId, reviewedAt, [cardId+reviewedAt]', outbox: '++seq, kind', settings: 'userId',
    events: 'id, occurredAt',
  });
  await legacy.table('decks').put({ id: 'd1', subjectId: 's1', name: 'CF/88' });
  legacy.close();
  db = new LocalDb();
  expect((await db.decks.get('d1'))?.name).toBe('CF/88');
  await db.subscriptions.put(SUBSCRIPTION);
  await db.errorReports.put({ cardId: 'c1', reportedAt: '2026-09-19T00:00:00Z' });
  expect(await db.subscriptions.count()).toBe(1);
  expect(await db.errorReports.count()).toBe(1);
});

it('clearForResync apaga inscrições e apontamentos locais', async () => {
  db = new LocalDb();
  await db.subscriptions.put(SUBSCRIPTION);
  await db.errorReports.put({ cardId: 'c1', reportedAt: '2026-09-19T00:00:00Z' });
  await db.clearForResync();
  expect(await db.subscriptions.count()).toBe(0);
  expect(await db.errorReports.count()).toBe(0);
});

it('clearAllLocalData apaga inscrições e apontamentos locais', async () => {
  db = new LocalDb();
  await db.subscriptions.put(SUBSCRIPTION);
  await db.errorReports.put({ cardId: 'c1', reportedAt: '2026-09-19T00:00:00Z' });
  await db.clearAllLocalData();
  expect(await db.subscriptions.count()).toBe(0);
  expect(await db.errorReports.count()).toBe(0);
});

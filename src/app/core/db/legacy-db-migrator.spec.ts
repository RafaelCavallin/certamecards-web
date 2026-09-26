import { afterEach, expect, it } from 'vitest';
import { AccountDb } from './account-db';
import { BootstrapDb } from './bootstrap-db';
import { LegacyDbMigrator } from './legacy-db-migrator';
import { LocalDb } from './local-db';

let legacyDb: LocalDb;
let bootstrapDb: BootstrapDb;
let accountDb: AccountDb;

afterEach(async () => {
  await legacyDb.delete();
  await bootstrapDb.delete();
  await accountDb.delete();
});

const DECK = {
  id: 'deck-1', subjectId: 'subject-1', name: 'CF/88', description: null, origin: 'own', originRef: null,
  originLabel: null, officialStatus: null, cardCount: 1, contentUpdatedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', deletedAt: null,
  version: 1, changeSeq: 1,
};
const CARD = {
  id: 'card-1', deckId: 'deck-1', type: 'basic', front: 'Frente', back: 'Verso', source: null,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', deletedAt: null,
  version: 1, changeSeq: 1, searchText: 'frente verso',
};

async function givenLegacyData(db: LocalDb): Promise<void> {
  await db.decks.put(DECK);
  await db.cards.put(CARD);
  await db.settings.put({
    userId: 'user-migration-1', newPerDay: 20, reviewsPerDay: 200, focusMinutes: 25,
    examDate: null, timeZone: 'America/Sao_Paulo', theme: 'auto', changeSeq: 1,
  });
}

it('TI-73 — migração copia os dados legados e limpa a cópia só após confirmar as contagens', async () => {
  legacyDb = new LocalDb();
  bootstrapDb = new BootstrapDb();
  accountDb = new AccountDb('user-migration-1');
  await givenLegacyData(legacyDb);
  await new LegacyDbMigrator(bootstrapDb, legacyDb, accountDb).migrate('user-migration-1');
  expect(await accountDb.decks.count()).toBe(1);
  expect(await accountDb.cards.count()).toBe(1);
  expect(await legacyDb.decks.count()).toBe(0);
  expect(await legacyDb.cards.count()).toBe(0);
  const record = await bootstrapDb.legacyMigration.get('user-migration-1');
  expect(record?.step).toBe('cleaned_up');
});

it('TI-73 — retomar após interrupção não duplica registros já copiados', async () => {
  legacyDb = new LocalDb();
  bootstrapDb = new BootstrapDb();
  accountDb = new AccountDb('user-migration-2');
  await givenLegacyData(legacyDb);
  await accountDb.decks.put(DECK);
  await new LegacyDbMigrator(bootstrapDb, legacyDb, accountDb).migrate('user-migration-2');
  expect(await accountDb.decks.count()).toBe(1);
  expect(await accountDb.cards.count()).toBe(1);
  expect(await legacyDb.decks.count()).toBe(0);
});

it('TI-73 — migração sintetiza os campos de ordem canônica dos logs e da outbox legados', async () => {
  legacyDb = new LocalDb();
  bootstrapDb = new BootstrapDb();
  accountDb = new AccountDb('user-migration-4');
  await givenLegacyData(legacyDb);
  const log = {
    id: 'log-legacy-1', cardId: 'card-1', kind: 'review' as const, rating: 3, reviewedAt: '2026-09-01T12:00:00.000Z',
    durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-legacy', sessionId: null,
    changeSeq: 1, voided: false,
  };
  await legacyDb.reviewLogs.put(log);
  await legacyDb.outbox.add({ kind: 'review', log, state: { cardId: 'card-1', state: 2, stability: 1, difficulty: 1, due: '2026-09-02T00:00:00Z', lastReview: null, reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 1, reviewCount: 1, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 0 } });

  await new LegacyDbMigrator(bootstrapDb, legacyDb, accountDb).migrate('user-migration-4');

  expect(await accountDb.reviewLogs.get('log-legacy-1')).toMatchObject({
    eventAt: '2026-09-01T12:00:00.000Z', eventCounter: 0, eventDeviceId: 'device-legacy', operationId: 'log-legacy-1',
  });
  const outboxItems = await accountDb.reviewOutbox.toArray();
  expect(outboxItems).toHaveLength(1);
  expect(outboxItems[0]).toMatchObject({ status: 'pending', observedServerTime: '2026-09-01T12:00:00.000Z' });
});

it('TI-73 — uma segunda chamada depois de concluída não reexecuta a cópia', async () => {
  legacyDb = new LocalDb();
  bootstrapDb = new BootstrapDb();
  accountDb = new AccountDb('user-migration-3');
  await givenLegacyData(legacyDb);
  const migrator = new LegacyDbMigrator(bootstrapDb, legacyDb, accountDb);
  await migrator.migrate('user-migration-3');
  await legacyDb.decks.put({ ...DECK, id: 'deck-2', name: 'Novo' });
  await migrator.migrate('user-migration-3');
  expect(await accountDb.decks.count()).toBe(1);
});

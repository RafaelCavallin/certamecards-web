import { afterEach, expect, it } from 'vitest';
import type { ChangeEntry } from '../api/sync.model';
import { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { applyChangeEntry } from './projection-resolver';
import { pendingOperation } from './projection-resolver-test-support';
import type { SettingsPatchPayload, SyncOperationPayload } from './sync-operation-payload.model';

let db: AccountDb;

afterEach(async () => {
  await db.delete();
});

it('TU — subject remoto é sempre aplicado direto', async () => {
  db = new AccountDb('projection-resolver-test-5');
  const remoteEntry: ChangeEntry = { changeSeq: 1, type: 'subject', payload: { id: 's1', name: 'Direito', active: true } };
  await applyChangeEntry(db, remoteEntry, 'u1');
  expect(await db.subjects.get('s1')).toMatchObject({ name: 'Direito', changeSeq: 1 });
});

it('TU — review_log e review_void são aplicados sempre (fatos append-only)', async () => {
  db = new AccountDb('projection-resolver-test-10');
  const reviewEntry: ChangeEntry = {
    changeSeq: 1, type: 'review_log',
    payload: {
      id: 'r1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 1,
      stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null,
      eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r1',
    },
  };
  await applyChangeEntry(db, reviewEntry, 'u1');
  expect(await db.reviewLogs.get('r1')).toMatchObject({ cardId: 'c1', voided: false, eventCounter: 0, operationId: 'r1' });
  const voidEntry: ChangeEntry = { changeSeq: 2, type: 'review_void', payload: { reviewId: 'r1', voidedAt: '2026-09-23T01:00:00Z' } };
  await applyChangeEntry(db, voidEntry, 'u1');
  expect(await db.reviewLogs.get('r1')).toMatchObject({ voided: true });
  expect(await db.reviewVoids.get('r1')).toMatchObject({ cardId: 'c1' });
});

it('TU-76 — um fato de reset recebido pelo feed limpa o marcador local de deckResets', async () => {
  db = new AccountDb('projection-resolver-test-18');
  await db.cards.add({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null,
    createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q r',
  });
  await db.deckResets.put({ operationId: 'op-1', deckId: 'd1', eventAt: '2026-09-23T00:00:00Z' });
  const resetEntry: ChangeEntry = {
    changeSeq: 3, type: 'review_log',
    payload: {
      id: 'r2', cardId: 'c1', kind: 'reset', rating: null, reviewedAt: '2026-09-23T00:00:01Z', durationMs: 0,
      stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null,
      eventAt: '2026-09-23T00:00:01Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r2',
    },
  };
  await applyChangeEntry(db, resetEntry, 'u1');
  expect(await db.deckResets.get('op-1')).toBeUndefined();
});

it('TU — subscription cancelada remove o deck local quando não há edição pendente', async () => {
  db = new AccountDb('projection-resolver-test-11');
  await db.decks.put({
    id: 'd1', subjectId: 's1', name: 'X', description: null, origin: 'official_subscription', originRef: null,
    originLabel: null, officialStatus: 'published', cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  });
  const entry: ChangeEntry = {
    changeSeq: 5, type: 'subscription',
    payload: { deckId: 'd1', subscribedAt: '2026-09-20T00:00:00Z', cancelledAt: '2026-09-23T00:00:00Z' },
  };
  await applyChangeEntry(db, entry, 'u1');
  expect(await db.decks.get('d1')).toBeUndefined();
});

it('TU — subscription cancelada não remove deck com edição local pendente', async () => {
  db = new AccountDb('projection-resolver-test-12');
  await db.decks.put({
    id: 'd1', subjectId: 's1', name: 'X', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  });
  await db.syncOperations.add(pendingOperation('deck_update', 'd1'));
  const entry: ChangeEntry = {
    changeSeq: 5, type: 'subscription',
    payload: { deckId: 'd1', subscribedAt: '2026-09-20T00:00:00Z', cancelledAt: '2026-09-23T00:00:00Z' },
  };
  await applyChangeEntry(db, entry, 'u1');
  expect(await db.decks.get('d1')).toBeDefined();
});

it('TU — settings remoto com ajuste pendente preserva o overlay local', async () => {
  db = new AccountDb('projection-resolver-test-13');
  await db.settings.put({
    userId: 'u1', newPerDay: 30, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo',
    theme: 'auto', changeSeq: 0, fieldClocks: {},
  });
  await db.syncOperations.add(settingsPatch('op-1', 1, { newPerDay: 30 }));
  const entry: ChangeEntry = {
    changeSeq: 5, type: 'settings',
    payload: { newPerDay: 10, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo', theme: 'auto' },
  };
  await applyChangeEntry(db, entry, 'u1');
  expect(await db.settings.get('u1')).toMatchObject({ newPerDay: 30, changeSeq: 5 });
});

it('TU-74 — settings remoto combina campos de outro dispositivo com o overlay pendente, na ordem das operações', async () => {
  db = new AccountDb('projection-resolver-test-13b');
  await db.settings.put({
    userId: 'u1', newPerDay: 40, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo',
    theme: 'noite', changeSeq: 0, fieldClocks: {},
  });
  await db.syncOperations.bulkAdd([
    settingsPatch('op-2', 2, { newPerDay: 40 }),
    settingsPatch('op-1', 1, { newPerDay: 30 }),
    { ...settingsPatch('op-0', 0, { focusMinutes: 50 }), status: 'synced' },
  ]);
  const entry: ChangeEntry = {
    changeSeq: 7, type: 'settings',
    payload: { newPerDay: 20, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo', theme: 'dia' },
  };
  await applyChangeEntry(db, entry, 'u1');
  expect(await db.settings.get('u1')).toMatchObject({ newPerDay: 40, theme: 'dia', focusMinutes: 25, changeSeq: 7 });
});

it('TU — settings remoto sem pendência aplica e preserva os relógios por campo', async () => {
  db = new AccountDb('projection-resolver-test-14');
  await db.settings.put({
    userId: 'u1', newPerDay: 30, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo',
    theme: 'auto', changeSeq: 0, fieldClocks: { newPerDay: { wallTime: '2026-09-20T00:00:00Z', logicalCounter: 0 } },
  });
  const entry: ChangeEntry = {
    changeSeq: 5, type: 'settings',
    payload: { newPerDay: 10, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo', theme: 'auto' },
  };
  await applyChangeEntry(db, entry, 'u1');
  const settings = await db.settings.get('u1');
  expect(settings).toMatchObject({ newPerDay: 10 });
  expect(settings?.fieldClocks.newPerDay).toBeDefined();
});

it('TU — profile remoto com edição pendente preserva o nome local', async () => {
  db = new AccountDb('projection-resolver-test-15');
  await db.profile.put({ userId: 'u1', displayName: 'Local', displayNameClock: null });
  await db.syncOperations.add(pendingOperation('profile_patch', 'u1'));
  const entry: ChangeEntry = { changeSeq: 5, type: 'profile', payload: { id: 'u1', displayName: 'Remoto' } };
  await applyChangeEntry(db, entry, 'u1');
  expect(await db.profile.get('u1')).toMatchObject({ displayName: 'Local' });
});

it('TU — profile remoto sem pendência aplica normalmente', async () => {
  db = new AccountDb('projection-resolver-test-16');
  const entry: ChangeEntry = { changeSeq: 5, type: 'profile', payload: { id: 'u1', displayName: 'Remoto' } };
  await applyChangeEntry(db, entry, 'u1');
  expect(await db.profile.get('u1')).toMatchObject({ displayName: 'Remoto' });
});

it('TU — conflito ativo é armazenado no cache local', async () => {
  db = new AccountDb('projection-resolver-test-17');
  const entry: ChangeEntry = {
    changeSeq: 5, type: 'conflict',
    payload: { id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: null, reason: 'edit_edit', expiresAt: '2026-10-01T00:00:00Z', restoredAt: null, expiredAt: null },
  };
  await applyChangeEntry(db, entry, 'u1');
  expect(await db.conflicts.get('conf-1')).toMatchObject({ entityId: 'c1', expiresAt: '2026-10-01T00:00:00Z' });
});

it('CA-20 — conflito restaurado continua registrado como resolvido, sem o snapshot', async () => {
  db = new AccountDb('projection-resolver-test-4');
  await db.conflicts.put({
    id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: null, reason: 'edit_edit',
    expiresAt: '2026-10-01T00:00:00Z', detail: null,
  });
  const remoteEntry: ChangeEntry = {
    changeSeq: 60, type: 'conflict',
    payload: { id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: null, reason: 'edit_edit', expiresAt: null, restoredAt: '2026-09-23T00:00:00Z', expiredAt: null },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  expect(await db.conflicts.get('conf-1')).toMatchObject({ restoredAt: '2026-09-23T00:00:00Z', expiresAt: '2026-10-01T00:00:00Z', detail: null });
  await applyChangeEntry(db, { ...remoteEntry, changeSeq: 61, payload: { ...remoteEntry.payload, restoredAt: null, expiredAt: '2026-10-01T00:00:00Z' } }, 'u1');
  expect(await db.conflicts.get('conf-1')).toBeUndefined();
});

function settingsPatch(
  operationId: string,
  deviceSequence: number,
  changes: SettingsPatchPayload['changes'],
): SyncOperationRow<SyncOperationPayload> {
  return {
    ...pendingOperation('settings_patch', 'u1'),
    operationId,
    deviceSequence,
    payload: { kind: 'settings_patch', changes },
  };
}

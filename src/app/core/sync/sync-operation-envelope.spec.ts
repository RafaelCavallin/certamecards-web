import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { buildOperationEnvelope } from './sync-operation-envelope';

let db: AccountDb;

afterEach(async () => {
  await db?.delete();
});

it('TU-67 — monta o envelope com relógio, deviceSequence e status pending', async () => {
  db = new AccountDb('envelope-test-1');
  await db.setServerTime('2026-09-17T12:00:00.000Z');
  const envelope = await buildOperationEnvelope(
    { db, userId: 'u1', deviceId: 'dev-1' },
    {
      kind: 'deck_create', entityId: 'd1', parentId: null, baseVersion: null, predecessorOperationId: null,
      dependsOn: [], payload: { kind: 'deck_delete', deckId: 'd1' },
    },
  );
  expect(envelope.accountId).toBe('u1');
  expect(envelope.deviceId).toBe('dev-1');
  expect(envelope.status).toBe('pending');
  expect(envelope.deviceSequence).toBe(1);
  expect(envelope.observedServerTime).toBe('2026-09-17T12:00:00.000Z');
  expect(envelope.clock.wallTime).not.toBe('');
  expect(envelope.syncedAt).toBeNull();
});

it('TU — deviceSequence avança a cada envelope gerado', async () => {
  db = new AccountDb('envelope-test-2');
  const draft = {
    kind: 'deck_create' as const, entityId: 'd1', parentId: null, baseVersion: null, predecessorOperationId: null,
    dependsOn: [], payload: { kind: 'deck_delete' as const, deckId: 'd1' },
  };
  const first = await buildOperationEnvelope({ db, userId: 'u1', deviceId: 'dev-1' }, draft);
  const second = await buildOperationEnvelope({ db, userId: 'u1', deviceId: 'dev-1' }, draft);
  expect(second.deviceSequence).toBe(first.deviceSequence + 1);
});

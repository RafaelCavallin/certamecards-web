import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AccountDb } from '../db/account-db';
import type { StudySessionStore } from './study-session-store';
import { setupStudySessionStore } from './study-session-store-test-support';

let db: AccountDb;
let store: StudySessionStore;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-18T09:00:00Z'));
  ({ db, store } = await setupStudySessionStore());
});

afterEach(async () => {
  vi.useRealTimers();
  await db.delete();
});

it('TU-15 — undo restaura cartão, fila, contadores e o histórico local', async () => {
  await store.start({ kind: 'all' }, 25);
  const firstCardId = store.current()?.ref.cardId;
  store.reveal();
  await store.rate(3);
  await store.flushPendingWrites();
  expect(store.done()).toBe(1);
  expect(await db.reviewLogs.count()).toBe(1);
  await store.undo();
  expect(store.current()?.ref.cardId).toBe(firstCardId);
  expect(store.revealed()).toBe(true);
  expect(store.done()).toBe(0);
  expect(store.canUndo()).toBe(false);
  expect(await db.reviewLogs.count()).toBe(0);
  expect(await db.cardStates.get(firstCardId ?? '')).toMatchObject({ reviewCount: 3 });
  expect(await db.reviewOutbox.count()).toBe(0);
});

it('TU-16 — cronômetro encerra a sessão na avaliação seguinte ao zerar, sem contar a pausa', async () => {
  await store.start({ kind: 'all' }, 1);
  store.reveal();
  await store.rate(3);
  expect(store.finishedReason()).toBeNull();
  vi.setSystemTime(new Date('2026-09-18T09:02:00Z'));
  store.reveal();
  await store.rate(3);
  expect(store.finishedReason()).toBe('focus_block');
  expect(store.current()).toBeNull();
});

it('TU-17 — minutos de foco só contam quando houve ao menos uma avaliação', async () => {
  await store.start({ kind: 'all' }, 25);
  const summary = store.end();
  expect(summary.reviewed).toBe(0);
  expect(summary.focusMinutes).toBe(0);
});

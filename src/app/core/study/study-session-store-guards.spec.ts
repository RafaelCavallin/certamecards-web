import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LocalDb } from '../db/local-db';
import type { StudySessionStore } from './study-session-store';
import { setupStudySessionStore } from './study-session-store-test-support';

let db: LocalDb;
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

it('TU — comandos da sessão não fazem nada antes de start()', async () => {
  expect(store.timerRemainingMs(new Date())).toBe(0);
  expect(store.timerPaused()).toBe(false);
  store.togglePause(new Date());
  store.reveal();
  await store.rate(3);
  await store.undo();
  expect(store.current()).toBeNull();
});

it('TU — reveal() não repete quando o cartão já está revelado', async () => {
  await store.start({ kind: 'all' }, 25);
  store.reveal();
  const previews = store.previews();
  store.reveal();
  expect(store.previews()).toBe(previews);
});

it('TU — rate() é ignorado antes de revelar a resposta', async () => {
  await store.start({ kind: 'all' }, 25);
  const before = store.current();
  await store.rate(3);
  expect(store.current()).toBe(before);
  expect(await db.reviewLogs.count()).toBe(0);
});

it('TU — undo() é ignorado quando a pilha está vazia', async () => {
  await store.start({ kind: 'all' }, 25);
  await store.undo();
  expect(store.canUndo()).toBe(false);
});

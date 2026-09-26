import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { HybridLogicalClock, tickHybridClock } from './hybrid-logical-clock';

let db: AccountDb;

afterEach(async () => {
  await db?.delete();
});

it('TU-55 — avança o relógio quando o tempo físico é maior que o anterior', () => {
  const previous = { wallTime: '2026-09-17T12:00:00.000Z', logicalCounter: 3 };
  const next = tickHybridClock(previous, Date.parse('2026-09-17T12:00:01.000Z'), null);
  expect(next.wallTime).toBe('2026-09-17T12:00:01.000Z');
  expect(next.logicalCounter).toBe(0);
});

it('TU-55 — não retrocede e incrementa o contador quando o tempo físico não avança', () => {
  const previous = { wallTime: '2026-09-17T12:00:00.000Z', logicalCounter: 3 };
  const next = tickHybridClock(previous, Date.parse('2026-09-17T11:59:00.000Z'), null);
  expect(next.wallTime).toBe(previous.wallTime);
  expect(next.logicalCounter).toBe(4);
});

it('TU-55 — incorpora o serverTime quando ele é mais recente que o relógio local', () => {
  const previous = { wallTime: '2026-09-17T12:00:00.000Z', logicalCounter: 3 };
  const next = tickHybridClock(previous, Date.parse('2026-09-17T12:00:00.000Z'), '2026-09-17T12:05:00.000Z');
  expect(next.wallTime).toBe('2026-09-17T12:05:00.000Z');
  expect(next.logicalCounter).toBe(0);
});

it('TU-55 — advance persiste o relógio e reaproveita o estado gravado na próxima chamada', async () => {
  db = new AccountDb('user-hlc-test');
  const clock = new HybridLogicalClock(db);
  const first = await clock.advance(Date.parse('2026-09-17T12:00:00.000Z'), null);
  expect(first.logicalCounter).toBe(0);
  const second = await clock.advance(Date.parse('2026-09-17T11:00:00.000Z'), null);
  expect(second.wallTime).toBe(first.wallTime);
  expect(second.logicalCounter).toBe(1);
  expect(await db.getClock()).toEqual(second);
});

it('TU — nextDeviceSequence persiste e devolve um contador crescente por dispositivo', async () => {
  db = new AccountDb('user-hlc-test-2');
  const clock = new HybridLogicalClock(db);
  expect(await clock.nextDeviceSequence()).toBe(1);
  expect(await clock.nextDeviceSequence()).toBe(2);
  expect(await db.getDeviceSequence()).toBe(2);
});

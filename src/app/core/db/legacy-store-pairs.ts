import type { AccountDb } from './account-db';
import type { ReviewOutboxItem } from './account-db.model';
import type { LocalDb } from './local-db';
import type { OutboxItem, ReviewLogRow as LegacyReviewLogRow } from './local-db.model';

function toAccountOutboxItem(item: OutboxItem, legacyLogs: readonly LegacyReviewLogRow[]): ReviewOutboxItem {
  if (item.kind !== 'review') {
    return { ...item, status: 'pending', retryAt: null };
  }
  const stored = legacyLogs.find((log) => log.id === item.log.id);
  const eventAt = stored?.reviewedAt ?? item.log.reviewedAt;
  return {
    ...item,
    log: { ...item.log, voided: false, eventAt, eventCounter: 0, eventDeviceId: item.log.deviceId, operationId: item.log.id },
    observedServerTime: eventAt,
    status: 'pending',
    retryAt: null,
  };
}
export interface StorePair {
  readonly name: string;
  readonly legacyCount: () => Promise<number>;
  readonly accountCount: () => Promise<number>;
}
export function storePairs(legacyDb: LocalDb, accountDb: AccountDb): readonly StorePair[] {
  return [
    { name: 'subjects', legacyCount: () => legacyDb.subjects.count(), accountCount: () => accountDb.subjects.count() },
    { name: 'decks', legacyCount: () => legacyDb.decks.count(), accountCount: () => accountDb.decks.count() },
    { name: 'cards', legacyCount: () => legacyDb.cards.count(), accountCount: () => accountDb.cards.count() },
    { name: 'cardStates', legacyCount: () => legacyDb.cardStates.count(), accountCount: () => accountDb.cardStates.count() },
    { name: 'reviewLogs', legacyCount: () => legacyDb.reviewLogs.count(), accountCount: () => accountDb.reviewLogs.count() },
    { name: 'outbox', legacyCount: () => legacyDb.outbox.count(), accountCount: () => accountDb.reviewOutbox.count() },
    { name: 'settings', legacyCount: () => legacyDb.settings.count(), accountCount: () => accountDb.settings.count() },
    {
      name: 'subscriptions',
      legacyCount: () => legacyDb.subscriptions.count(),
      accountCount: () => accountDb.subscriptions.count(),
    },
    { name: 'events', legacyCount: () => legacyDb.events.count(), accountCount: () => accountDb.events.count() },
  ];
}
export async function copyLegacyStores(legacyDb: LocalDb, accountDb: AccountDb): Promise<void> {
  await accountDb.subjects.bulkPut(await legacyDb.subjects.toArray());
  await accountDb.decks.bulkPut(await legacyDb.decks.toArray());
  await accountDb.cards.bulkPut(await legacyDb.cards.toArray());
  await accountDb.cardStates.bulkPut(await legacyDb.cardStates.toArray());
  const legacyLogs = await legacyDb.reviewLogs.toArray();
  await accountDb.reviewLogs.bulkPut(
    legacyLogs.map((log) => ({
      ...log, eventAt: log.reviewedAt, eventCounter: 0, eventDeviceId: log.deviceId, operationId: log.id,
    })),
  );
  const legacyOutbox = await legacyDb.outbox.toArray();
  await accountDb.reviewOutbox.bulkPut(
    legacyOutbox.map((item) => toAccountOutboxItem(item, legacyLogs)),
  );
  await accountDb.settings.bulkPut((await legacyDb.settings.toArray()).map((settings) => ({ ...settings, fieldClocks: {} })));
  await accountDb.subscriptions.bulkPut(await legacyDb.subscriptions.toArray());
  await accountDb.events.bulkPut(await legacyDb.events.toArray());
}
export async function clearLegacyContentStores(legacyDb: LocalDb): Promise<void> {
  const tables = [
    legacyDb.subjects, legacyDb.decks, legacyDb.cards, legacyDb.cardStates, legacyDb.reviewLogs,
    legacyDb.outbox, legacyDb.settings, legacyDb.subscriptions, legacyDb.errorReports, legacyDb.events,
  ];
  await legacyDb.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()));
  });
}

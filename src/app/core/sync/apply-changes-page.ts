import type { ChangesPage } from '../api/sync.model';
import { toCardRow } from '../db/card-row';
import type { LocalDb } from '../db/local-db';
import type { ReviewLogRow, SettingsRow } from '../db/local-db.model';

export async function applyChangesPage(db: LocalDb, page: ChangesPage): Promise<void> {
  const session = await db.getSession();
  const tables = [db.subjects, db.decks, db.cards, db.cardStates, db.reviewLogs, db.settings, db.subscriptions];
  await db.transaction('rw', tables, async () => {
    await db.subjects.bulkPut([...page.subjects]);
    await db.decks.bulkPut([...page.decks]);
    await db.cards.bulkPut(page.cards.map((card) => toCardRow(card)));
    await db.cardStates.bulkPut([...page.cardStates]);
    await db.reviewLogs.bulkPut(page.reviewLogs.map(toReviewLogRow));
    await applySubscriptions(db, page.subscriptions);
    await applyVoids(db, page.reviewVoids);
    await applySettings(db, page.settings, session?.userId ?? null);
  });
}
async function applySubscriptions(db: LocalDb, subscriptions: ChangesPage['subscriptions']): Promise<void> {
  for (const subscription of subscriptions) {
    await db.subscriptions.put(subscription);
    if (subscription.cancelledAt !== null) {
      await removeDeckLocally(db, subscription.deckId);
    }
  }
}
export async function removeDeckLocally(db: LocalDb, deckId: string): Promise<void> {
  const cardIds = await db.cards.where('deckId').equals(deckId).primaryKeys();
  await db.cardStates.bulkDelete(cardIds);
  await db.cards.bulkDelete(cardIds);
  await db.decks.delete(deckId);
}
function toReviewLogRow(log: ChangesPage['reviewLogs'][number]): ReviewLogRow {
  return { ...log, voided: false };
}
async function applyVoids(db: LocalDb, voids: ChangesPage['reviewVoids']): Promise<void> {
  for (const voidItem of voids) {
    await db.reviewLogs.update(voidItem.reviewId, { voided: true });
  }
}
async function applySettings(db: LocalDb, settings: ChangesPage['settings'], userId: string | null): Promise<void> {
  if (settings === null || userId === null) {
    return;
  }
  const row: SettingsRow = { ...settings, userId };
  await db.settings.put(row);
}

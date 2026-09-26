import { Injectable, inject } from '@angular/core';
import type { ChangesPage } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import type { AccountDb } from '../db/account-db';
import { applyChangeEntry } from './projection-resolver';
import { SYNC_PAGE_LIMIT } from './sync-constants';

@Injectable({ providedIn: 'root' })
export class GlobalPullRunner {
  private readonly syncApi = inject(SyncApi);

  async pull(db: AccountDb, userId: string): Promise<void> {
    let cursor = await db.getCursor();
    let hasMore = true;
    while (hasMore) {
      const page = await this.syncApi.changes(cursor, SYNC_PAGE_LIMIT);
      await this.applyPage(db, page, userId);
      ({ nextCursor: cursor, hasMore } = page);
    }
  }

  private async applyPage(db: AccountDb, page: ChangesPage, userId: string): Promise<void> {
    const tables = [
      db.subjects, db.decks, db.cards, db.cardStates, db.reviewLogs, db.reviewVoids, db.deckResets,
      db.subscriptions, db.settings, db.profile, db.conflicts, db.syncOperations, db.meta, db.remoteBases,
    ];
    await db.transaction('rw', tables, async () => {
      for (const entry of page.changes) {
        await applyChangeEntry(db, entry, userId);
      }
      await db.setCursor(page.nextCursor);
      await db.setServerTime(page.serverTime);
    });
  }
}

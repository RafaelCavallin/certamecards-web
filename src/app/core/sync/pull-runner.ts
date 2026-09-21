import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { extractApiError } from '../api/api-error.model';
import { SyncApi } from '../api/sync-api';
import { LocalDb } from '../db/local-db';
import { applyChangesPage } from './apply-changes-page';
import { RESYNC_REQUIRED_CODE, SYNC_PAGE_LIMIT } from './sync-constants';

@Injectable({ providedIn: 'root' })
export class PullRunner {
  private readonly syncApi = inject(SyncApi);
  private readonly localDb = inject(LocalDb);

  async pull(): Promise<void> {
    try {
      await this.pullPages();
    } catch (error) {
      await this.handlePullError(error);
    }
  }

  private async pullPages(): Promise<void> {
    let cursor = await this.localDb.getCursor();
    let hasMore = true;
    while (hasMore) {
      const page = await this.syncApi.changes(cursor, SYNC_PAGE_LIMIT);
      await applyChangesPage(this.localDb, page);
      ({ nextCursor: cursor, hasMore } = page);
      await this.localDb.setCursor(cursor);
    }
    await this.localDb.setLastSyncAt(new Date().toISOString());
  }

  private async handlePullError(error: unknown): Promise<void> {
    if (!isResyncRequired(error)) {
      throw error;
    }
    await this.localDb.clearForResync();
    await this.pullPages();
  }
}
function isResyncRequired(error: unknown): boolean {
  return error instanceof HttpErrorResponse && extractApiError(error)?.code === RESYNC_REQUIRED_CODE;
}

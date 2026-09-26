import { Injectable, Injector, inject, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { SyncApi } from '../api/sync-api';
import type { ConflictDetail } from '../api/sync.model';
import { accountLiveSignal } from '../data/account-live-query';
import { CurrentAccountDb } from '../db/current-account-db';
import type { CurrentAccount } from '../db/current-account-db';
import type { ConflictCacheRow } from '../db/account-db.model';
import { isConflictExpired, pruneExpiredConflictSnapshots, withExpiredSnapshotsStripped } from './conflict-expiry';

export class ConflictExpiredError extends Error {
  constructor() {
    super('Este conflito não pode mais ser restaurado: o prazo de 30 dias já passou.');
    this.name = 'ConflictExpiredError';
  }
}
@Injectable({ providedIn: 'root' })
export class ConflictCache {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly syncApi = inject(SyncApi);
  private readonly injector = inject(Injector);
  private readonly loadingIds = signal<ReadonlySet<string>>(new Set());
  private readonly errorIds = signal<ReadonlySet<string>>(new Set());

  readonly all: Signal<readonly ConflictCacheRow[]> = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => this.fetchOrdered(account), initialValue: [],
  });

  isLoading(id: string): boolean {
    return this.loadingIds().has(id);
  }

  hasError(id: string): boolean {
    return this.errorIds().has(id);
  }

  async loadDetail(id: string): Promise<ConflictDetail> {
    const account = this.currentAccountDb.require();
    const row = await account.db.conflicts.get(id);
    if (row !== undefined && isConflictExpired(row, new Date().toISOString())) {
      throw new ConflictExpiredError();
    }
    if (row?.detail !== null && row?.detail !== undefined) {
      return row.detail;
    }
    return this.fetchAndCacheDetail(account, id);
  }

  private async fetchAndCacheDetail(account: CurrentAccount, id: string): Promise<ConflictDetail> {
    this.setFlag(this.loadingIds, id, true);
    try {
      const detail = await this.syncApi.conflictDetail(id);
      await account.db.conflicts.update(id, { detail });
      this.setFlag(this.errorIds, id, false);
      return detail;
    } catch (error) {
      this.setFlag(this.errorIds, id, true);
      throw error;
    } finally {
      this.setFlag(this.loadingIds, id, false);
    }
  }

  private async fetchOrdered(account: CurrentAccount): Promise<readonly ConflictCacheRow[]> {
    const rows = await account.db.conflicts.orderBy('expiresAt').toArray();
    const nowIso = new Date().toISOString();
    void pruneExpiredConflictSnapshots(account.db, nowIso);
    return withExpiredSnapshotsStripped(rows, nowIso);
  }

  private setFlag(target: WritableSignal<ReadonlySet<string>>, id: string, value: boolean): void {
    target.update((current) => {
      const next = new Set(current);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}

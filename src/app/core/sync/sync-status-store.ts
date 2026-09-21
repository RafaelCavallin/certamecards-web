import { Injectable, computed, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { LocalDb } from '../db/local-db';
import type { SyncStatus } from './sync-status.model';

@Injectable({ providedIn: 'root' })
export class SyncStatusStore {
  private readonly localDb = inject(LocalDb);
  private readonly connectivity = inject(ConnectivityStore);
  private readonly hasErrorSignal = signal(false);

  readonly pendingCount: Signal<number> = toSignal(from(liveQuery(() => this.localDb.outbox.count())), {
    initialValue: 0,
  });

  readonly status: Signal<SyncStatus> = computed(() => this.computeStatus());

  reportError(hasError: boolean): void {
    this.hasErrorSignal.set(hasError);
  }

  private computeStatus(): SyncStatus {
    if (!this.connectivity.online()) {
      return 'offline';
    }
    if (this.hasErrorSignal()) {
      return 'error';
    }
    return this.pendingCount() > 0 ? 'pending' : 'synced';
  }
}

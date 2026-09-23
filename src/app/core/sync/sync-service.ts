import { Injectable, effect, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { AuthStore } from '../auth/auth-store';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { EventsService } from '../events/events-service';
import { OutboxFlusher } from './outbox-flusher';
import { PullRunner } from './pull-runner';
import { StaleResolver } from './stale-resolver';
import { registerSyncTriggers } from './sync-triggers';
import { watchReconnect } from './watch-reconnect';
import { SyncStatusStore } from './sync-status-store';
import type { SyncStatus } from './sync-status.model';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly connectivity = inject(ConnectivityStore);
  private readonly authStore = inject(AuthStore);
  private readonly pullRunner = inject(PullRunner);
  private readonly flusher = inject(OutboxFlusher);
  private readonly staleResolver = inject(StaleResolver);
  private readonly statusStore = inject(SyncStatusStore);
  private readonly eventsService = inject(EventsService);
  private pulling: Promise<void> | null = null;
  private flushing: Promise<void> | null = null;

  readonly pendingCount: Signal<number> = this.statusStore.pendingCount;
  readonly status: Signal<SyncStatus> = this.statusStore.status;

  constructor() {
    registerSyncTriggers({
      onOnline: () => {
        void this.pull();
        void this.flush();
      },
      onVisible: () => void this.flush(),
      onPoll: () => {
        if (this.statusStore.pendingCount() > 0) {
          void this.flush();
        }
      },
    });
    watchReconnect(this.connectivity.online, () => {
      void this.pull();
      void this.flush();
    });
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        void this.pull();
        void this.flush();
      }
    });
  }

  pull(): Promise<void> {
    if (!this.canSync()) {
      return Promise.resolve();
    }
    this.pulling ??= this.pullRunner.pull().finally(() => {
      this.pulling = null;
    });
    return this.pulling;
  }

  flush(): Promise<void> {
    if (!this.canSync()) {
      return Promise.resolve();
    }
    this.flushing ??= this.runFlush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private canSync(): boolean {
    return this.connectivity.online() && this.authStore.isAuthenticated();
  }

  private async runFlush(): Promise<void> {
    const pendingBefore = this.statusStore.pendingCount();
    try {
      const staleCardIds = await this.flusher.flushAll();
      if (staleCardIds.length > 0) {
        await this.staleResolver.resolve(staleCardIds);
        await this.flusher.flushAll();
      }
      this.statusStore.reportError(false);
      if (pendingBefore > 0) {
        void this.eventsService.record('sync_flushed', { itemCount: pendingBefore });
      }
    } catch {
      this.statusStore.reportError(true);
    }
  }
}

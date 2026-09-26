import { Injectable, inject } from '@angular/core';
import { EventsApi } from '../api/events-api';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import type { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { registerSyncTriggers } from '../sync/sync-triggers';
import { EVENTS_FLUSH_POLL_MS, MAX_EVENTS_PER_BATCH, MAX_LOCAL_EVENTS } from './events-constants';
import type { ProductEvent, ProductEventName } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly eventsApi = inject(EventsApi);
  private readonly connectivity = inject(ConnectivityStore);
  private flushing: Promise<void> | null = null;

  constructor() {
    registerSyncTriggers({ onTrigger: () => void this.flush() }, { window, document }, EVENTS_FLUSH_POLL_MS);
  }

  async record(name: ProductEventName, props: Record<string, unknown> = {}): Promise<void> {
    const db = this.currentAccountDb.current()?.db;
    if (db === undefined) {
      return;
    }
    const event: ProductEvent = { id: crypto.randomUUID(), name, props, occurredAt: new Date().toISOString() };
    await db.events.add(event);
    await this.trimToLimit(db);
    void this.flush();
  }

  flush(): Promise<void> {
    if (!this.connectivity.online()) {
      return Promise.resolve();
    }
    this.flushing ??= this.runFlush()
      .catch(() => undefined)
      .finally(() => {
        this.flushing = null;
      });
    return this.flushing;
  }

  private async runFlush(): Promise<void> {
    const db = this.currentAccountDb.current()?.db;
    if (db === undefined) {
      return;
    }
    const batch = await db.events.orderBy('occurredAt').limit(MAX_EVENTS_PER_BATCH).toArray();
    if (batch.length === 0) {
      return;
    }
    await this.eventsApi.submit(batch);
    await db.events.bulkDelete(batch.map((event) => event.id));
  }

  private async trimToLimit(db: AccountDb): Promise<void> {
    const count = await db.events.count();
    const overflow = count - MAX_LOCAL_EVENTS;
    if (overflow <= 0) {
      return;
    }
    const oldest = await db.events.orderBy('occurredAt').limit(overflow).primaryKeys();
    await db.events.bulkDelete(oldest);
  }
}

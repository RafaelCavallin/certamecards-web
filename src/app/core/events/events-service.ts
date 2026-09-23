import { Injectable, inject } from '@angular/core';
import { EventsApi } from '../api/events-api';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { LocalDb } from '../db/local-db';
import { registerSyncTriggers } from '../sync/sync-triggers';
import { EVENTS_FLUSH_POLL_MS, MAX_EVENTS_PER_BATCH, MAX_LOCAL_EVENTS } from './events-constants';
import type { ProductEvent, ProductEventName } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly localDb = inject(LocalDb);
  private readonly eventsApi = inject(EventsApi);
  private readonly connectivity = inject(ConnectivityStore);
  private flushing: Promise<void> | null = null;

  constructor() {
    registerSyncTriggers(
      { onOnline: () => void this.flush(), onVisible: () => void this.flush(), onPoll: () => void this.flush() },
      { window, document },
      EVENTS_FLUSH_POLL_MS,
    );
  }

  async record(name: ProductEventName, props: Record<string, unknown> = {}): Promise<void> {
    const event: ProductEvent = { id: crypto.randomUUID(), name, props, occurredAt: new Date().toISOString() };
    await this.localDb.events.add(event);
    await this.trimToLimit();
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
    const batch = await this.localDb.events.orderBy('occurredAt').limit(MAX_EVENTS_PER_BATCH).toArray();
    if (batch.length === 0) {
      return;
    }
    await this.eventsApi.submit(batch);
    await this.localDb.events.bulkDelete(batch.map((event) => event.id));
  }

  private async trimToLimit(): Promise<void> {
    const count = await this.localDb.events.count();
    const overflow = count - MAX_LOCAL_EVENTS;
    if (overflow <= 0) {
      return;
    }
    const oldest = await this.localDb.events.orderBy('occurredAt').limit(overflow).primaryKeys();
    await this.localDb.events.bulkDelete(oldest);
  }
}

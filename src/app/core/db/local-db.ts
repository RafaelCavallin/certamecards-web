import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';
import type { CardState } from '../api/card-state.model';
import type { Deck } from '../api/deck.model';
import type { DeckSubscription } from '../api/library.model';
import type { Subject } from '../api/subject.model';
import { LOCAL_DB_SCHEMA_VERSIONS } from './local-db-schema';
import { isDeviceId, isStoredSession } from './local-db.model';
import type { CardRow, ErrorReportRow, EventRow, MetaRow, OutboxItem, ReviewLogRow, SettingsRow, StoredSession } from './local-db.model';

const DATABASE_NAME = 'certamecards';
const SESSION_KEY = 'session' as const;
const DEVICE_ID_KEY = 'deviceId' as const;
const CURSOR_KEY = 'cursor' as const;
const LAST_SYNC_AT_KEY = 'lastSyncAt' as const;
const DEFAULT_CURSOR = 0;
@Injectable({ providedIn: 'root' })
export class LocalDb extends Dexie {
  meta!: Table<MetaRow, string>;
  subjects!: Table<Subject, string>;
  decks!: Table<Deck, string>;
  cards!: Table<CardRow, string>;
  cardStates!: Table<CardState, string>;
  reviewLogs!: Table<ReviewLogRow, string>;
  outbox!: Table<OutboxItem, number>;
  settings!: Table<SettingsRow, string>;
  events!: Table<EventRow, string>;
  subscriptions!: Table<DeckSubscription, string>;
  errorReports!: Table<ErrorReportRow, string>;

  constructor() {
    super(DATABASE_NAME);
    LOCAL_DB_SCHEMA_VERSIONS.forEach((stores, index) => this.version(index + 1).stores(stores));
  }

  async getSession(): Promise<StoredSession | null> {
    const row = await this.meta.get(SESSION_KEY);
    return row !== undefined && isStoredSession(row.value) ? row.value : null;
  }

  async setSession(session: StoredSession): Promise<void> {
    const row: MetaRow<'session'> = { key: SESSION_KEY, value: session };
    await this.meta.put(row);
  }

  async clearSession(): Promise<void> {
    await this.meta.delete(SESSION_KEY);
  }
  async getOrCreateDeviceId(): Promise<string> {
    const row = await this.meta.get(DEVICE_ID_KEY);
    if (row !== undefined && isDeviceId(row.value)) {
      return row.value;
    }
    const deviceId = crypto.randomUUID();
    const newRow: MetaRow<'deviceId'> = { key: DEVICE_ID_KEY, value: deviceId };
    await this.meta.put(newRow);
    return deviceId;
  }

  async getCursor(): Promise<number> {
    const row = await this.meta.get(CURSOR_KEY);
    return typeof row?.value === 'number' ? row.value : DEFAULT_CURSOR;
  }
  async setCursor(cursor: number): Promise<void> {
    const row: MetaRow<'cursor'> = { key: CURSOR_KEY, value: cursor };
    await this.meta.put(row);
  }
  async setLastSyncAt(isoDate: string): Promise<void> {
    const row: MetaRow<'lastSyncAt'> = { key: LAST_SYNC_AT_KEY, value: isoDate };
    await this.meta.put(row);
  }

  async clearForResync(): Promise<void> {
    const tables = [this.subjects, this.decks, this.cards, this.cardStates, this.reviewLogs, this.settings,
      this.subscriptions, this.errorReports];
    await this.transaction('rw', tables, async () => {
      await Promise.all(tables.map((table) => table.clear()));
    });
    await this.setCursor(DEFAULT_CURSOR);
  }

  async clearAllLocalData(): Promise<void> {
    const tables = [
      this.meta, this.subjects, this.decks, this.cards, this.cardStates,
      this.reviewLogs, this.outbox, this.settings, this.events, this.subscriptions, this.errorReports,
    ];
    await this.transaction('rw', tables, async () => {
      await Promise.all(tables.map((table) => table.clear()));
    });
  }
}

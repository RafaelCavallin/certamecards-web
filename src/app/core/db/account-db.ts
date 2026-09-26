import Dexie, { type Table } from 'dexie';
import type { CardState } from '../api/card-state.model';
import type { Deck } from '../api/deck.model';
import type { DeckSubscription } from '../api/library.model';
import type { Subject } from '../api/subject.model';
import { isHybridClockState } from '../sync/event-order.model';
import type { HybridClockState } from '../sync/event-order.model';
import { isSyncLeaseState } from '../sync/sync-lease.model';
import type { SyncLeaseState } from '../sync/sync-lease.model';
import type { SyncOperationPayload } from '../sync/sync-operation-payload.model';
import { ACCOUNT_DB_SCHEMA_VERSIONS } from './account-db-schema';
import type {
  AccountMetaRow, AccountSettingsRow, ConflictCacheRow, DeckResetRow, ProfileRow, ReviewLogRow, ReviewOutboxItem,
  RemoteBaseRow, ReviewVoidRow, SyncOperationRow,
} from './account-db.model';
import type { CardRow, EventRow } from './local-db.model';

const CURSOR_KEY = 'cursor' as const;
const LAST_SYNC_AT_KEY = 'lastSyncAt' as const;
const SERVER_TIME_KEY = 'serverTime' as const;
const CLOCK_KEY = 'clock' as const;
const LEASE_KEY = 'lease' as const;
const DEVICE_SEQUENCE_KEY = 'deviceSequence' as const;
const DEFAULT_CURSOR = 0;
const DEFAULT_DEVICE_SEQUENCE = 0;
const EPOCH_ISO = new Date(0).toISOString();
export function accountDatabaseName(userId: string): string {
  return `certamecards-account-${userId}`;
}
export class AccountDb extends Dexie {
  meta!: Table<AccountMetaRow, string>;
  subjects!: Table<Subject, string>;
  decks!: Table<Deck, string>;
  cards!: Table<CardRow, string>;
  cardStates!: Table<CardState, string>;
  deckResets!: Table<DeckResetRow, string>;
  reviewLogs!: Table<ReviewLogRow, string>;
  reviewVoids!: Table<ReviewVoidRow, string>;
  syncOperations!: Table<SyncOperationRow<SyncOperationPayload>, string>;
  reviewOutbox!: Table<ReviewOutboxItem, number>;
  settings!: Table<AccountSettingsRow, string>;
  profile!: Table<ProfileRow, string>;
  subscriptions!: Table<DeckSubscription, string>;
  conflicts!: Table<ConflictCacheRow, string>;
  events!: Table<EventRow, string>;
  remoteBases!: Table<RemoteBaseRow, string>;

  constructor(readonly userId: string) {
    super(accountDatabaseName(userId));
    ACCOUNT_DB_SCHEMA_VERSIONS.forEach((stores, index) => this.version(index + 1).stores(stores));
  }

  async getCursor(): Promise<number> {
    const row = await this.meta.get(CURSOR_KEY);
    return typeof row?.value === 'number' ? row.value : DEFAULT_CURSOR;
  }

  async setCursor(cursor: number): Promise<void> {
    await this.meta.put({ key: CURSOR_KEY, value: cursor });
  }

  async setLastSyncAt(isoDate: string): Promise<void> {
    await this.meta.put({ key: LAST_SYNC_AT_KEY, value: isoDate });
  }

  async setServerTime(isoDate: string): Promise<void> {
    await this.meta.put({ key: SERVER_TIME_KEY, value: isoDate });
  }

  async getServerTime(): Promise<string> {
    const row = await this.meta.get(SERVER_TIME_KEY);
    return typeof row?.value === 'string' ? row.value : EPOCH_ISO;
  }

  async getClock(): Promise<HybridClockState | null> {
    const row = await this.meta.get(CLOCK_KEY);
    return row !== undefined && isHybridClockState(row.value) ? row.value : null;
  }

  async setClock(clock: HybridClockState): Promise<void> {
    await this.meta.put({ key: CLOCK_KEY, value: clock });
  }

  async getLease(): Promise<SyncLeaseState | null> {
    const row = await this.meta.get(LEASE_KEY);
    return row !== undefined && isSyncLeaseState(row.value) ? row.value : null;
  }

  async setLease(lease: SyncLeaseState | null): Promise<void> {
    await this.meta.put({ key: LEASE_KEY, value: lease });
  }

  async getDeviceSequence(): Promise<number> {
    const row = await this.meta.get(DEVICE_SEQUENCE_KEY);
    return typeof row?.value === 'number' ? row.value : DEFAULT_DEVICE_SEQUENCE;
  }

  async setDeviceSequence(sequence: number): Promise<void> {
    await this.meta.put({ key: DEVICE_SEQUENCE_KEY, value: sequence });
  }
}

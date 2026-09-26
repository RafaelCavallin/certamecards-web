import type { AccountDb } from '../db/account-db';
import { ACCOUNT_LEASE_HEARTBEAT_MS } from './sync-constants';
import { SyncLease } from './sync-lease';

export async function withAccountLease(db: AccountDb, ownerId: string, body: () => Promise<void>): Promise<void> {
  const lease = new SyncLease(db, ownerId);
  if (!(await lease.acquire(Date.now()))) {
    return;
  }
  const heartbeat = setInterval(() => void lease.heartbeat(Date.now()), ACCOUNT_LEASE_HEARTBEAT_MS);
  try {
    await body();
  } finally {
    clearInterval(heartbeat);
    await lease.release();
  }
}

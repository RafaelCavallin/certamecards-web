import type { AccountDb } from '../db/account-db';
import type { SyncLeaseState } from './sync-lease.model';

const LEASE_DURATION_MS = 15_000;
function isExpired(lease: SyncLeaseState | null, nowMs: number): boolean {
  return lease === null || Date.parse(lease.expiresAt) <= nowMs;
}
export class SyncLease {
  constructor(
    private readonly db: AccountDb,
    private readonly ownerId: string,
  ) {}

  async acquire(nowMs: number): Promise<boolean> {
    const current = await this.db.getLease();
    if (!isExpired(current, nowMs) && current?.ownerId !== this.ownerId) {
      return false;
    }
    await this.db.setLease({ ownerId: this.ownerId, expiresAt: this.expiryFrom(nowMs) });
    return true;
  }

  async heartbeat(nowMs: number): Promise<void> {
    const current = await this.db.getLease();
    if (current?.ownerId !== this.ownerId) {
      return;
    }
    await this.db.setLease({ ownerId: this.ownerId, expiresAt: this.expiryFrom(nowMs) });
  }

  async release(): Promise<void> {
    const current = await this.db.getLease();
    if (current?.ownerId === this.ownerId) {
      await this.db.setLease(null);
    }
  }

  private expiryFrom(nowMs: number): string {
    return new Date(nowMs + LEASE_DURATION_MS).toISOString();
  }
}

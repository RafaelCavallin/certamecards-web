import type { AccountDb } from '../db/account-db';
import type { HybridClockState } from './event-order.model';

const EPOCH_START: HybridClockState = { wallTime: new Date(0).toISOString(), logicalCounter: 0 };
export function tickHybridClock(previous: HybridClockState, physicalNowMs: number, serverTimeIso: string | null): HybridClockState {
  const previousMs = Date.parse(previous.wallTime);
  const serverMs = serverTimeIso !== null ? Date.parse(serverTimeIso) : 0;
  const wallTimeMs = Math.max(physicalNowMs, previousMs, serverMs);
  const logicalCounter = wallTimeMs > previousMs ? 0 : previous.logicalCounter + 1;
  return { wallTime: new Date(wallTimeMs).toISOString(), logicalCounter };
}
export class HybridLogicalClock {
  constructor(private readonly db: AccountDb) {}

  async advance(nowMs: number, serverTimeIso: string | null): Promise<HybridClockState> {
    const previous = (await this.db.getClock()) ?? EPOCH_START;
    const next = tickHybridClock(previous, nowMs, serverTimeIso);
    await this.db.setClock(next);
    return next;
  }

  async nextDeviceSequence(): Promise<number> {
    const next = (await this.db.getDeviceSequence()) + 1;
    await this.db.setDeviceSequence(next);
    return next;
  }
}

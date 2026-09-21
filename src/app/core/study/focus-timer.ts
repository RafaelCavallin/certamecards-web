const MINUTE_MS = 60_000;
export interface FocusTimerSnapshot {
  readonly focusMs: number;
  readonly elapsedMs: number;
  readonly runningSince: number | null;
}
export class FocusTimer {
  private state: FocusTimerSnapshot;

  constructor(focusMinutes: number, now: Date) {
    this.state = { focusMs: focusMinutes * MINUTE_MS, elapsedMs: 0, runningSince: now.getTime() };
  }

  elapsedMs(now: Date): number {
    const running = this.state.runningSince === null ? 0 : now.getTime() - this.state.runningSince;
    return this.state.elapsedMs + running;
  }

  remainingMs(now: Date): number {
    return Math.max(0, this.state.focusMs - this.elapsedMs(now));
  }

  isBlockDone(now: Date): boolean {
    return this.remainingMs(now) <= 0;
  }

  get paused(): boolean {
    return this.state.runningSince === null;
  }

  togglePause(now: Date): void {
    if (this.state.runningSince === null) {
      this.state = { ...this.state, runningSince: now.getTime() };
      return;
    }
    this.state = { ...this.state, elapsedMs: this.elapsedMs(now), runningSince: null };
  }
}

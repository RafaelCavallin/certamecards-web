import { Injectable, signal } from '@angular/core';

const OFFLINE_HTTP_STATUSES = [502, 503, 504];
export const RECHECK_DELAY_MS = 2_000;
@Injectable({ providedIn: 'root' })
export class ConnectivityStore {
  private readonly onlineSignal = signal(navigator.onLine);
  private recheckScheduled = false;

  readonly online = this.onlineSignal.asReadonly();

  constructor() {
    window.addEventListener('online', () => this.onlineSignal.set(true));
    window.addEventListener('offline', () => this.onlineSignal.set(false));
  }

  reportHttpStatus(status: number): void {
    if (status === 0 || OFFLINE_HTTP_STATUSES.includes(status)) {
      this.onlineSignal.set(false);
      this.scheduleRecheck();
      return;
    }
    this.onlineSignal.set(true);
  }

  private scheduleRecheck(): void {
    if (this.recheckScheduled || !navigator.onLine) {
      return;
    }
    this.recheckScheduled = true;
    setTimeout(() => {
      this.recheckScheduled = false;
      if (navigator.onLine) {
        this.onlineSignal.set(true);
      }
    }, RECHECK_DELAY_MS);
  }
}

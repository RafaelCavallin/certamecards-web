import { Injectable, signal } from '@angular/core';

const OFFLINE_HTTP_STATUSES = [502, 503, 504];
@Injectable({ providedIn: 'root' })
export class ConnectivityStore {
  private readonly onlineSignal = signal(navigator.onLine);

  readonly online = this.onlineSignal.asReadonly();

  constructor() {
    window.addEventListener('online', () => this.onlineSignal.set(true));
    window.addEventListener('offline', () => this.onlineSignal.set(false));
  }

  reportHttpStatus(status: number): void {
    if (status === 0 || OFFLINE_HTTP_STATUSES.includes(status)) {
      this.onlineSignal.set(false);
      return;
    }
    this.onlineSignal.set(true);
  }
}

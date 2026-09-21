import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RefreshScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;

  schedule(delayMs: number, callback: () => void): void {
    this.clear();
    this.timer = setTimeout(callback, delayMs);
  }

  clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

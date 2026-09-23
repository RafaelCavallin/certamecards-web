import { effect, untracked } from '@angular/core';
import type { Signal } from '@angular/core';

export function watchReconnect(online: Signal<boolean>, onReconnect: () => void): void {
  let wasOnline = online();
  effect(() => {
    const isOnline = online();
    const reconnected = isOnline && !wasOnline;
    wasOnline = isOnline;
    if (reconnected) {
      untracked(onReconnect);
    }
  });
}

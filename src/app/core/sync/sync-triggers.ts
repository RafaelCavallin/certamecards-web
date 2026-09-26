import { effect, untracked } from '@angular/core';
import { SYNC_WATCHDOG_INTERVAL_MS } from './sync-constants';

export interface SyncTriggerHandlers {
  readonly onTrigger: () => void;
  readonly onReconnect?: () => void;
}
export interface SyncTriggerWindow {
  addEventListener(type: 'online', listener: () => void): void;
}
export interface SyncTriggerDocument {
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  readonly visibilityState: string;
}
export interface SyncTriggerTargets {
  readonly window: SyncTriggerWindow;
  readonly document: SyncTriggerDocument;
}
export function registerSyncTriggers(
  handlers: SyncTriggerHandlers,
  targets: SyncTriggerTargets = { window, document },
  watchdogIntervalMs: number = SYNC_WATCHDOG_INTERVAL_MS,
): () => void {
  targets.window.addEventListener('online', handlers.onReconnect ?? handlers.onTrigger);
  targets.document.addEventListener('visibilitychange', () => {
    if (targets.document.visibilityState === 'visible') {
      handlers.onTrigger();
    }
  });
  const watchdog = setInterval(handlers.onTrigger, watchdogIntervalMs);
  return () => clearInterval(watchdog);
}
export interface ReactiveTriggerSignals {
  readonly isAuthenticated: () => boolean;
  readonly pendingCount: () => number;
}
export function registerReactiveTriggers(signals: ReactiveTriggerSignals, onTrigger: () => void): void {
  effect(() => {
    if (signals.isAuthenticated()) {
      untracked(onTrigger);
    }
  });
  let previousPending = 0;
  effect(() => {
    const pending = signals.pendingCount();
    const grew = pending > previousPending;
    previousPending = pending;
    if (grew) {
      untracked(onTrigger);
    }
  });
}

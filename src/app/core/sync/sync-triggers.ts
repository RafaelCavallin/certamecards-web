import { FLUSH_POLL_INTERVAL_MS } from './sync-constants';

export interface SyncTriggerHandlers {
  readonly onOnline: () => void;
  readonly onVisible: () => void;
  readonly onPoll: () => void;
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
  pollIntervalMs: number = FLUSH_POLL_INTERVAL_MS,
): void {
  targets.window.addEventListener('online', handlers.onOnline);
  targets.document.addEventListener('visibilitychange', () => {
    if (targets.document.visibilityState === 'visible') {
      handlers.onVisible();
    }
  });
  setInterval(handlers.onPoll, pollIntervalMs);
}

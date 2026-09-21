import { afterEach, expect, it, vi } from 'vitest';
import type { SyncTriggerDocument, SyncTriggerTargets, SyncTriggerWindow } from './sync-triggers';
import { registerSyncTriggers } from './sync-triggers';
import { FLUSH_POLL_INTERVAL_MS } from './sync-constants';

function fakeTargets(visibilityState: string): {
  targets: SyncTriggerTargets;
  triggerOnline: () => void;
  triggerVisibilityChange: () => void;
} {
  let onlineListener: (() => void) | null = null;
  let visibilityListener: (() => void) | null = null;
  const window: SyncTriggerWindow = {
    addEventListener: (_type, listener) => {
      onlineListener = listener;
    },
  };
  const document: SyncTriggerDocument = {
    visibilityState,
    addEventListener: (_type, listener) => {
      visibilityListener = listener;
    },
  };
  return {
    targets: { window, document },
    triggerOnline: () => onlineListener?.(),
    triggerVisibilityChange: () => visibilityListener?.(),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

it('TU — dispara onOnline quando o navegador reconecta', () => {
  const onOnline = vi.fn();
  const { targets, triggerOnline } = fakeTargets('visible');
  registerSyncTriggers({ onOnline, onVisible: vi.fn(), onPoll: vi.fn() }, targets);
  triggerOnline();
  expect(onOnline).toHaveBeenCalledOnce();
});

it('TU — dispara onVisible quando a aba volta a ficar visível', () => {
  const onVisible = vi.fn();
  const { targets, triggerVisibilityChange } = fakeTargets('visible');
  registerSyncTriggers({ onOnline: vi.fn(), onVisible, onPoll: vi.fn() }, targets);
  triggerVisibilityChange();
  expect(onVisible).toHaveBeenCalledOnce();
});

it('TU — não dispara onVisible quando a aba fica oculta', () => {
  const onVisible = vi.fn();
  const { targets, triggerVisibilityChange } = fakeTargets('hidden');
  registerSyncTriggers({ onOnline: vi.fn(), onVisible, onPoll: vi.fn() }, targets);
  triggerVisibilityChange();
  expect(onVisible).not.toHaveBeenCalled();
});

it('TU — dispara onPoll a cada intervalo configurado', () => {
  vi.useFakeTimers();
  const onPoll = vi.fn();
  const { targets } = fakeTargets('visible');
  registerSyncTriggers({ onOnline: vi.fn(), onVisible: vi.fn(), onPoll }, targets);
  vi.advanceTimersByTime(FLUSH_POLL_INTERVAL_MS * 2);
  expect(onPoll).toHaveBeenCalledTimes(2);
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { SYNC_WATCHDOG_INTERVAL_MS } from './sync-constants';
import type { SyncTriggerDocument, SyncTriggerTargets, SyncTriggerWindow } from './sync-triggers';
import { registerReactiveTriggers, registerSyncTriggers } from './sync-triggers';

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

it('TU — dispara onTrigger quando o navegador reconecta', () => {
  const onTrigger = vi.fn();
  const { targets, triggerOnline } = fakeTargets('visible');
  registerSyncTriggers({ onTrigger }, targets);
  triggerOnline();
  expect(onTrigger).toHaveBeenCalledOnce();
});

it('TU — usa onReconnect em vez de onTrigger quando informado, para antecipar o backoff', () => {
  const onTrigger = vi.fn();
  const onReconnect = vi.fn();
  const { targets, triggerOnline } = fakeTargets('visible');
  registerSyncTriggers({ onTrigger, onReconnect }, targets);
  triggerOnline();
  expect(onReconnect).toHaveBeenCalledOnce();
  expect(onTrigger).not.toHaveBeenCalled();
});

it('TU — dispara onTrigger quando a aba volta a ficar visível', () => {
  const onTrigger = vi.fn();
  const { targets, triggerVisibilityChange } = fakeTargets('visible');
  registerSyncTriggers({ onTrigger }, targets);
  triggerVisibilityChange();
  expect(onTrigger).toHaveBeenCalledOnce();
});

it('TU — não dispara onTrigger quando a aba fica oculta', () => {
  const onTrigger = vi.fn();
  const { targets, triggerVisibilityChange } = fakeTargets('hidden');
  registerSyncTriggers({ onTrigger }, targets);
  triggerVisibilityChange();
  expect(onTrigger).not.toHaveBeenCalled();
});

it('TU-70 — dispara onTrigger a cada intervalo do watchdog', () => {
  vi.useFakeTimers();
  const onTrigger = vi.fn();
  const { targets } = fakeTargets('visible');
  registerSyncTriggers({ onTrigger }, targets);
  vi.advanceTimersByTime(SYNC_WATCHDOG_INTERVAL_MS * 2);
  expect(onTrigger).toHaveBeenCalledTimes(2);
});

it('TU — registerReactiveTriggers dispara ao autenticar e ao crescer a fila, não ao encolher', async () => {
  TestBed.configureTestingModule({});
  const authenticated = signal(false);
  const pendingCount = signal(0);
  const onTrigger = vi.fn();
  TestBed.runInInjectionContext(() => registerReactiveTriggers({ isAuthenticated: authenticated, pendingCount }, onTrigger));
  authenticated.set(true);
  await waitFor(() => onTrigger.mock.calls.length === 1);
  pendingCount.set(3);
  await waitFor(() => onTrigger.mock.calls.length === 2);
  pendingCount.set(1);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(onTrigger).toHaveBeenCalledTimes(2);
});

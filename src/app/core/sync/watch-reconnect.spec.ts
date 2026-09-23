import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { watchReconnect } from './watch-reconnect';

function setup(initial: boolean): { online: ReturnType<typeof signal<boolean>>; onReconnect: () => void } {
  const online = signal(initial);
  const onReconnect = vi.fn();
  TestBed.runInInjectionContext(() => watchReconnect(online, onReconnect));
  TestBed.tick();
  return { online, onReconnect };
}

it('TU — chama onReconnect quando volta de offline para online', () => {
  const { online, onReconnect } = setup(true);
  online.set(false);
  TestBed.tick();
  online.set(true);
  TestBed.tick();
  expect(onReconnect).toHaveBeenCalledOnce();
});

it('TU — não chama onReconnect enquanto permanece online', () => {
  const { onReconnect } = setup(true);
  expect(onReconnect).not.toHaveBeenCalled();
});

it('TU — não chama onReconnect ao ficar offline', () => {
  const { online, onReconnect } = setup(true);
  online.set(false);
  TestBed.tick();
  expect(onReconnect).not.toHaveBeenCalled();
});

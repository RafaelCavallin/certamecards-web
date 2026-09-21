import { signal } from '@angular/core';
import { expect, it } from 'vitest';
import type { CurrentCard, FinishedReason, PreviewByRating } from './study-session.model';
import { remainingCount, resetSignals, setCurrent, syncCounters, type SessionSignals } from './study-session-signals';

function someSignals(): SessionSignals {
  return {
    current: signal<CurrentCard | null>(null),
    revealed: signal(false),
    previews: signal<PreviewByRating | null>(null),
    done: signal(0),
    total: signal(0),
    canUndo: signal(false),
    finishedReason: signal<FinishedReason>(null),
  };
}

it('TU — syncCounters não faz nada sem sessão ativa', () => {
  const signals = someSignals();
  syncCounters(signals, null, true);
  expect(signals.done()).toBe(0);
});

it('TU — remainingCount é 0 sem sessão ativa', () => {
  expect(remainingCount(null, true)).toBe(0);
});

it('TU — setCurrent e resetSignals limpam revelado e prévias', () => {
  const signals = someSignals();
  signals.revealed.set(true);
  setCurrent(signals, null, null);
  expect(signals.revealed()).toBe(false);
  expect(signals.current()).toBeNull();
  signals.done.set(5);
  resetSignals(signals);
  expect(signals.done()).toBe(0);
  expect(signals.canUndo()).toBe(false);
});

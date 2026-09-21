import { expect, it } from 'vitest';
import { FocusTimer } from './focus-timer';

const START = new Date('2026-09-18T09:00:00Z');

it('TU — remainingMs decresce conforme o tempo passa', () => {
  const timer = new FocusTimer(25, START);
  expect(timer.remainingMs(new Date(START.getTime() + 5 * 60_000))).toBe(20 * 60_000);
});

it('TU — isBlockDone fica verdadeiro ao esgotar o bloco', () => {
  const timer = new FocusTimer(1, START);
  expect(timer.isBlockDone(new Date(START.getTime() + 30_000))).toBe(false);
  expect(timer.isBlockDone(new Date(START.getTime() + 60_000))).toBe(true);
});

it('TU — pausar não conta o tempo decorrido depois da pausa', () => {
  const timer = new FocusTimer(25, START);
  const pauseAt = new Date(START.getTime() + 5 * 60_000);
  timer.togglePause(pauseAt);
  expect(timer.paused).toBe(true);
  const muchLater = new Date(pauseAt.getTime() + 60 * 60_000);
  expect(timer.elapsedMs(muchLater)).toBe(5 * 60_000);
});

it('TU — retomar volta a contar a partir do momento da retomada', () => {
  const timer = new FocusTimer(25, START);
  const pauseAt = new Date(START.getTime() + 5 * 60_000);
  timer.togglePause(pauseAt);
  const resumeAt = new Date(pauseAt.getTime() + 60_000);
  timer.togglePause(resumeAt);
  expect(timer.paused).toBe(false);
  const later = new Date(resumeAt.getTime() + 2 * 60_000);
  expect(timer.elapsedMs(later)).toBe(7 * 60_000);
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RefreshScheduler } from './refresh-scheduler';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('TU — executa o callback depois do atraso agendado', () => {
  const scheduler = new RefreshScheduler();
  const callback = vi.fn();
  scheduler.schedule(1000, callback);
  vi.advanceTimersByTime(999);
  expect(callback).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledTimes(1);
});

it('TU — reagendar cancela o callback anterior', () => {
  const scheduler = new RefreshScheduler();
  const first = vi.fn();
  const second = vi.fn();
  scheduler.schedule(1000, first);
  scheduler.schedule(1000, second);
  vi.advanceTimersByTime(1000);
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

it('TU — clear cancela o callback agendado', () => {
  const scheduler = new RefreshScheduler();
  const callback = vi.fn();
  scheduler.schedule(1000, callback);
  scheduler.clear();
  vi.advanceTimersByTime(1000);
  expect(callback).not.toHaveBeenCalled();
});

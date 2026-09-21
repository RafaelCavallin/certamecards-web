import { expect, it, vi } from 'vitest';
import type { Rating } from '../../core/scheduler/scheduler.model';
import { dispatchStudyShortcut, type StudyShortcutHandlers } from './study-shortcuts';

function aKeydown(key: string, overrides: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...overrides });
}

interface Spies {
  readonly handlers: StudyShortcutHandlers;
  readonly reveal: ReturnType<typeof vi.fn>;
  readonly rate: ReturnType<typeof vi.fn<(rating: Rating) => void>>;
  readonly undo: ReturnType<typeof vi.fn>;
  readonly end: ReturnType<typeof vi.fn>;
}

function someHandlers(revealed: boolean): Spies {
  const reveal = vi.fn();
  const rate = vi.fn<(rating: Rating) => void>();
  const undo = vi.fn();
  const end = vi.fn();
  return { handlers: { revealed, reveal, rate, undo, end }, reveal, rate, undo, end };
}

it('TU — ignora teclas com Ctrl/Cmd/Alt pressionados', () => {
  const spies = someHandlers(false);
  dispatchStudyShortcut(aKeydown(' ', { ctrlKey: true }), spies.handlers);
  expect(spies.reveal).not.toHaveBeenCalled();
});

it('TU — Esc encerra a sessão a qualquer momento', () => {
  const spies = someHandlers(true);
  dispatchStudyShortcut(aKeydown('Escape'), spies.handlers);
  expect(spies.end).toHaveBeenCalledOnce();
});

it('TU — Z desfaz a qualquer momento', () => {
  const spies = someHandlers(false);
  dispatchStudyShortcut(aKeydown('z'), spies.handlers);
  expect(spies.undo).toHaveBeenCalledOnce();
});

it('TU — Espaço revela quando a resposta está oculta', () => {
  const spies = someHandlers(false);
  dispatchStudyShortcut(aKeydown(' '), spies.handlers);
  expect(spies.reveal).toHaveBeenCalledOnce();
});

it('TU — Espaço avalia Bom quando a resposta já está revelada', () => {
  const spies = someHandlers(true);
  dispatchStudyShortcut(aKeydown(' '), spies.handlers);
  expect(spies.rate).toHaveBeenCalledWith(3);
});

it('TU — 1 a 4 avaliam quando revelado, e são ignorados quando oculto', () => {
  const revealedSpies = someHandlers(true);
  dispatchStudyShortcut(aKeydown('4'), revealedSpies.handlers);
  expect(revealedSpies.rate).toHaveBeenCalledWith(4);
  const hiddenSpies = someHandlers(false);
  dispatchStudyShortcut(aKeydown('4'), hiddenSpies.handlers);
  expect(hiddenSpies.rate).not.toHaveBeenCalled();
});

it('TU — outras teclas não disparam nenhum atalho', () => {
  const spies = someHandlers(true);
  dispatchStudyShortcut(aKeydown('a'), spies.handlers);
  expect(spies.rate).not.toHaveBeenCalled();
  expect(spies.reveal).not.toHaveBeenCalled();
});

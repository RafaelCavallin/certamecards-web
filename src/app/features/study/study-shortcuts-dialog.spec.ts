import { expect, it, vi } from 'vitest';
import { dispatchStudyShortcut } from './study-shortcuts';

function handlers(): { reveal: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; all: Parameters<typeof dispatchStudyShortcut>[1] } {
  const reveal = vi.fn();
  const end = vi.fn();
  return { reveal, end, all: { revealed: false, reveal, rate: vi.fn(), undo: vi.fn(), end } };
}
function keydownFrom(target: HTMLElement, key: string): KeyboardEvent {
  document.body.append(target);
  const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
  target.dispatchEvent(event);
  target.remove();
  return event;
}

it('CA-22 — teclas digitadas dentro de um dialog não disparam atalhos da sessão', () => {
  const dialog = document.createElement('dialog');
  const textarea = document.createElement('textarea');
  dialog.append(textarea);
  const spies = handlers();
  document.body.append(dialog);
  const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true });
  Object.defineProperty(event, 'target', { value: textarea });
  dispatchStudyShortcut(event, spies.all);
  dialog.remove();
  expect(spies.reveal).not.toHaveBeenCalled();
});

it('CA-22 — Esc dentro de um campo de texto não encerra a sessão', () => {
  const spies = handlers();
  const event = keydownFrom(document.createElement('input'), 'Escape');
  Object.defineProperty(event, 'target', { value: document.createElement('input') });
  dispatchStudyShortcut(event, spies.all);
  expect(spies.end).not.toHaveBeenCalled();
});

it('CA-22 — fora de campos e dialogs o atalho continua valendo', () => {
  const spies = handlers();
  dispatchStudyShortcut(new KeyboardEvent('keydown', { key: ' ', cancelable: true }), spies.all);
  expect(spies.reveal).toHaveBeenCalledOnce();
});

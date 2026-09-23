import { expect, it } from 'vitest';
import { captureFocus } from './focus-return';

it('TU — devolve o foco ao elemento que o tinha quando foi capturado', () => {
  const trigger = document.createElement('button');
  const other = document.createElement('button');
  document.body.append(trigger, other);
  trigger.focus();
  const restore = captureFocus();
  other.focus();
  restore();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
  other.remove();
});

it('TU — não falha se o elemento saiu do documento', () => {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const restore = captureFocus();
  trigger.remove();
  expect(() => restore()).not.toThrow();
});

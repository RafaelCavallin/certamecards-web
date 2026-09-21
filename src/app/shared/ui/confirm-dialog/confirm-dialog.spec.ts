import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryAll, rootText } from '../../../testing/dom-testing';
import { ConfirmDialog } from './confirm-dialog';

function setup(): { fixture: ReturnType<typeof TestBed.createComponent<ConfirmDialog>> } {
  const fixture = TestBed.createComponent(ConfirmDialog);
  fixture.componentRef.setInput('title', 'Excluir deck');
  fixture.componentRef.setInput('message', 'Os cartões e o progresso serão apagados.');
  fixture.componentRef.setInput('open', true);
  return { fixture };
}

it('TU — mostra o texto da consequência', () => {
  const { fixture } = setup();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Os cartões e o progresso serão apagados.');
});

it('TU — emite confirmed ao clicar em confirmar', () => {
  const { fixture } = setup();
  const handler = vi.fn();
  fixture.componentInstance.confirmed.subscribe(handler);
  fixture.detectChanges();
  queryAll(fixture, 'button')[1]?.click();
  expect(handler).toHaveBeenCalledOnce();
});

it('TU — emite canceled ao clicar em cancelar', () => {
  const { fixture } = setup();
  const handler = vi.fn();
  fixture.componentInstance.canceled.subscribe(handler);
  fixture.detectChanges();
  queryAll(fixture, 'button')[0]?.click();
  expect(handler).toHaveBeenCalledOnce();
});

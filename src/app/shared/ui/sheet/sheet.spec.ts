import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryElement } from '../../../testing/dom-testing';
import { Sheet } from './sheet';

it('TU — abre o dialog nativo quando open é verdadeiro', () => {
  const fixture = TestBed.createComponent(Sheet);
  fixture.componentRef.setInput('title', 'Novo deck');
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const dialog = queryElement(fixture, 'dialog') as HTMLDialogElement | null;
  expect(dialog?.open).toBe(true);
});

it('TU — fecha o dialog quando open volta a falso', () => {
  const fixture = TestBed.createComponent(Sheet);
  fixture.componentRef.setInput('title', 'Novo deck');
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  fixture.componentRef.setInput('open', false);
  fixture.detectChanges();
  const dialog = queryElement(fixture, 'dialog') as HTMLDialogElement | null;
  expect(dialog?.open).toBe(false);
});

it('TU — associa o título ao dialog por aria-labelledby', () => {
  const fixture = TestBed.createComponent(Sheet);
  fixture.componentRef.setInput('title', 'Ajustes');
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const dialog = queryElement(fixture, 'dialog');
  const labelledBy = dialog?.getAttribute('aria-labelledby') ?? '';
  expect(queryElement(fixture, `#${labelledBy}`)?.textContent).toBe('Ajustes');
});

it('TU — emite closed ao clicar em fechar', () => {
  const fixture = TestBed.createComponent(Sheet);
  fixture.componentRef.setInput('title', 'Novo deck');
  fixture.componentRef.setInput('open', true);
  const handler = vi.fn();
  fixture.componentInstance.closed.subscribe(handler);
  fixture.detectChanges();
  queryElement(fixture, 'button[aria-label="Fechar"]')?.click();
  expect(handler).toHaveBeenCalledOnce();
});

import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryAll } from '../../../testing/dom-testing';
import { DeckRow } from './deck-row';

function studyButton(fixture: ReturnType<typeof TestBed.createComponent<DeckRow>>): HTMLButtonElement {
  const button = queryAll(fixture, 'button')[1];
  if (button === undefined) {
    throw new Error('botão de estudar não encontrado');
  }
  return button as HTMLButtonElement;
}

it('TU — mostra "Em dia" desabilitado quando não há nada para hoje', () => {
  const fixture = TestBed.createComponent(DeckRow);
  fixture.componentRef.setInput('title', 'CF/88');
  fixture.detectChanges();
  const button = studyButton(fixture);
  expect(button.textContent?.trim()).toBe('Em dia');
  expect(button.disabled).toBe(true);
});

it('TU — mostra "Estudar" quando há cartões vencidos', () => {
  const fixture = TestBed.createComponent(DeckRow);
  fixture.componentRef.setInput('title', 'CF/88');
  fixture.componentRef.setInput('due', 3);
  fixture.detectChanges();
  const button = studyButton(fixture);
  expect(button.textContent?.trim()).toBe('Estudar');
  expect(button.disabled).toBe(false);
});

it('TU — emite study ao clicar em Estudar', () => {
  const fixture = TestBed.createComponent(DeckRow);
  fixture.componentRef.setInput('title', 'CF/88');
  fixture.componentRef.setInput('fresh', 5);
  const handler = vi.fn();
  fixture.componentInstance.study.subscribe(handler);
  fixture.detectChanges();
  studyButton(fixture)?.click();
  expect(handler).toHaveBeenCalledOnce();
});

it('TU — emite open ao clicar no nome do deck', () => {
  const fixture = TestBed.createComponent(DeckRow);
  fixture.componentRef.setInput('title', 'CF/88');
  const handler = vi.fn();
  fixture.componentInstance.open.subscribe(handler);
  fixture.detectChanges();
  queryAll(fixture, 'button')[0]?.click();
  expect(handler).toHaveBeenCalledOnce();
});

import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryElement, rootText } from '../../../../testing/dom-testing';
import { CardListItem } from './card-list-item';

function setup(): ReturnType<typeof TestBed.createComponent<CardListItem>> {
  const fixture = TestBed.createComponent(CardListItem);
  fixture.componentRef.setInput('front', 'Qual o prazo?');
  fixture.componentRef.setInput('back', '120 dias');
  fixture.componentRef.setInput('source', 'Lei 12.016/09');
  fixture.componentRef.setInput('dueText', 'hoje');
  fixture.detectChanges();
  return fixture;
}

it('TU — mostra frente, fonte e verso', () => {
  const fixture = setup();
  const text = rootText(fixture);
  expect(text).toContain('Qual o prazo?');
  expect(text).toContain('Lei 12.016/09');
  expect(text).toContain('120 dias');
});

it('TU-19 — mostra a tag Problemático quando leech é verdadeiro', () => {
  const fixture = setup();
  fixture.componentRef.setInput('leech', true);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Problemático');
});

it('TU — emite open ao clicar no cartão', () => {
  const fixture = setup();
  const handler = vi.fn();
  fixture.componentInstance.open.subscribe(handler);
  queryElement(fixture, 'button')?.click();
  expect(handler).toHaveBeenCalledOnce();
});

import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryAll, queryElement } from '../../../testing/dom-testing';
import { RatingBar } from './rating-bar';

function setup(): ReturnType<typeof TestBed.createComponent<RatingBar>> {
  const fixture = TestBed.createComponent(RatingBar);
  fixture.componentRef.setInput('intervals', { 1: '1 min', 2: '6 min', 3: '10 min', 4: '4 d' });
  fixture.detectChanges();
  return fixture;
}

it('TU — mostra os quatro botões com os intervalos recebidos', () => {
  const fixture = setup();
  const buttons = queryAll(fixture, 'button');
  expect(buttons).toHaveLength(4);
  expect(queryElement(fixture, '#s-rate-4')?.textContent).toContain('4 d');
});

it('TU — emite a nota escolhida ao clicar', () => {
  const fixture = setup();
  let emitted: number | undefined;
  fixture.componentInstance.rate.subscribe((rating: number) => (emitted = rating));
  queryElement(fixture, '#s-rate-3')?.click();
  expect(emitted).toBe(3);
});

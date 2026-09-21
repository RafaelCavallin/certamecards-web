import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryElement, rootText } from '../../../../testing/dom-testing';
import { CardList } from './card-list';

it('TU — mostra a mensagem de lista vazia sem cartões', () => {
  const fixture = TestBed.createComponent(CardList);
  fixture.componentRef.setInput('rows', []);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Nenhum cartão encontrado.');
});

it('TU — mostra a viewport virtualizada quando há cartões', () => {
  const fixture = TestBed.createComponent(CardList);
  fixture.componentRef.setInput('rows', [
    { id: 'c1', front: 'Q', back: 'R', source: null, dueText: 'hoje', leech: false, suspended: false },
  ]);
  fixture.detectChanges();
  expect(queryElement(fixture, 'cdk-virtual-scroll-viewport')).not.toBeNull();
});

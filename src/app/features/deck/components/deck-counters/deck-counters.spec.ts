import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryElement, rootText } from '../../../../testing/dom-testing';
import { DeckCounters } from './deck-counters';

it('TU — mostra todos os contadores do deck', () => {
  const fixture = TestBed.createComponent(DeckCounters);
  fixture.componentRef.setInput('counters', { total: 10, fresh: 3, learning: 2, review: 4, suspended: 1, dueToday: 5 });
  fixture.detectChanges();
  const text = rootText(fixture);
  expect(text).toContain('10');
  expect(text).toContain('Para hoje');
  expect(text).toContain('5');
});

it('TU — expõe "Para hoje" como grupo acessível com a contagem no rótulo', () => {
  const fixture = TestBed.createComponent(DeckCounters);
  fixture.componentRef.setInput('counters', { total: 10, fresh: 3, learning: 2, review: 4, suspended: 1, dueToday: 5 });
  fixture.detectChanges();
  expect(queryElement(fixture, '[role="group"][aria-label="Para hoje: 5"]')).not.toBeNull();
});

import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryAll, rootText } from '../../../../testing/dom-testing';
import { ReviewsChart } from './reviews-chart';

const DAYS = [
  { dateKey: '2026-09-16', reviews: 5 },
  { dateKey: '2026-09-17', reviews: 10 },
];

it('TU — renderiza uma barra por dia e o texto acessível com as revisões', () => {
  const fixture = TestBed.createComponent(ReviewsChart);
  fixture.componentRef.setInput('days', DAYS);
  fixture.detectChanges();
  const bars = queryAll(fixture, 'div[aria-hidden="true"] > div');
  expect(bars).toHaveLength(2);
  expect(rootText(fixture)).toContain('10 revisões');
});

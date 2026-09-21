import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { rootText } from '../../../../testing/dom-testing';
import { StatsTotals } from './stats-totals';

it('TU-18 — exibe o total de revisões, o acerto e os minutos de foco', () => {
  const fixture = TestBed.createComponent(StatsTotals);
  fixture.componentRef.setInput('totalReviews', 10);
  fixture.componentRef.setInput('accuracyPercent', 70);
  fixture.componentRef.setInput('focusMinutes', 25);
  fixture.detectChanges();
  const text = rootText(fixture);
  expect(text).toContain('10 revisões');
  expect(text).toContain('70%');
  expect(text).toContain('25');
});

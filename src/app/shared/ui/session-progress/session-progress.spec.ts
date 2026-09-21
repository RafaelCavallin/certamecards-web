import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryElement, rootText } from '../../../testing/dom-testing';
import { SessionProgress } from './session-progress';

it('TU — mostra o contador feitos / total', () => {
  const fixture = TestBed.createComponent(SessionProgress);
  fixture.componentRef.setInput('current', 12);
  fixture.componentRef.setInput('total', 40);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('12 / 40');
  const bar = queryElement(fixture, '[role="progressbar"]');
  expect(bar?.getAttribute('aria-valuenow')).toBe('12');
  expect(bar?.getAttribute('aria-valuemax')).toBe('40');
});

it('TU — fica em 100% quando o total é zero', () => {
  const fixture = TestBed.createComponent(SessionProgress);
  fixture.componentRef.setInput('current', 0);
  fixture.componentRef.setInput('total', 0);
  fixture.detectChanges();
  const fill = queryElement(fixture, '.bg-amber');
  expect(fill?.style.width).toBe('100%');
});

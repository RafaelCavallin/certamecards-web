import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryElement } from '../../../testing/dom-testing';
import { Tag } from './tag';

it('TU — tom neutral é o padrão', () => {
  const fixture = TestBed.createComponent(Tag);
  fixture.detectChanges();
  const span = queryElement(fixture, 'span');
  expect(span?.className).toContain('border-line');
});

it('TU — tom accent usa o fundo amber-soft', () => {
  const fixture = TestBed.createComponent(Tag);
  fixture.componentRef.setInput('tone', 'accent');
  fixture.detectChanges();
  const span = queryElement(fixture, 'span');
  expect(span?.className).toContain('bg-amber-soft');
});

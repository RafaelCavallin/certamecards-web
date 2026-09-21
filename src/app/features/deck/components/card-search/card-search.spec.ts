import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryElement, setInputValue } from '../../../../testing/dom-testing';
import { CardSearch } from './card-search';

it('TU-20 — emite queryChange ao digitar na busca', () => {
  const fixture = TestBed.createComponent(CardSearch);
  const handler = vi.fn();
  fixture.componentInstance.queryChange.subscribe(handler);
  fixture.detectChanges();
  setInputValue(fixture, 'input[type="search"]', 'mandado');
  expect(handler).toHaveBeenCalledWith('mandado');
});

it('TU — emite stateFilterChange ao trocar o filtro', () => {
  const fixture = TestBed.createComponent(CardSearch);
  const handler = vi.fn();
  fixture.componentInstance.stateFilterChange.subscribe(handler);
  fixture.detectChanges();
  const select = queryElement(fixture, 'select') as HTMLSelectElement;
  select.value = 'suspended';
  select.dispatchEvent(new Event('change'));
  expect(handler).toHaveBeenCalledWith('suspended');
});

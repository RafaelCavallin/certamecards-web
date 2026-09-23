import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { rootText } from '../../../testing/dom-testing';
import { DeckRow } from './deck-row';

it('CA-05 — mostra os selos do deck como texto', () => {
  const fixture = TestBed.createComponent(DeckRow);
  fixture.componentRef.setInput('title', 'CF/88');
  fixture.componentRef.setInput('badges', ['Oficial', 'Descontinuado']);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Oficial');
  expect(rootText(fixture)).toContain('Descontinuado');
});

it('CA-05 — deck sem selos não mostra nenhum', () => {
  const fixture = TestBed.createComponent(DeckRow);
  fixture.componentRef.setInput('title', 'CF/88');
  fixture.detectChanges();
  expect(rootText(fixture)).not.toContain('Oficial');
});

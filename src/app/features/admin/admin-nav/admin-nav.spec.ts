import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expect, it } from 'vitest';
import { rootText } from '../../../testing/dom-testing';
import { AdminNav } from './admin-nav';

it('TU — mostra os links para matérias e administradores', () => {
  TestBed.configureTestingModule({ imports: [AdminNav], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(AdminNav);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Matérias');
  expect(rootText(fixture)).toContain('Administradores');
  expect(rootText(fixture)).toContain('Decks oficiais');
  expect(rootText(fixture)).toContain('Apontamentos');
  expect(rootText(fixture)).toContain('Registro');
});

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { setInputValue, submitForm, textContent } from '../../../testing/dom-testing';
import { expect, it } from 'vitest';
import { aSubject, setupSubjectsPage } from './subjects-page-harness';
import { SubjectsPage } from './subjects-page';

it('TU-06 — lista as matérias com situação e número de decks', async () => {
  setupSubjectsPage([aSubject({ name: 'Direito Penal', deckCount: 3 })]);
  const fixture = TestBed.createComponent(SubjectsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, 'table')).toContain('Direito Penal');
  expect(textContent(fixture, 'table')).toContain('3');
});

it('TU-06 — cria uma matéria e adiciona à lista', async () => {
  const { createSubject } = setupSubjectsPage([]);
  createSubject.mockResolvedValue(aSubject({ id: '2', name: 'Direito Tributário', deckCount: 0 }));
  const fixture = TestBed.createComponent(SubjectsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  setInputValue(fixture, '#new-subject-name', 'Direito Tributário');
  submitForm(fixture, 'form');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(createSubject).toHaveBeenCalledWith({ name: 'Direito Tributário' });
  expect(textContent(fixture, 'table')).toContain('Direito Tributário');
});

it('TU-06 — nome duplicado mostra a mensagem de erro', async () => {
  const { createSubject } = setupSubjectsPage([]);
  createSubject.mockRejectedValue(
    new HttpErrorResponse({ status: 409, error: { code: 'subject_name_taken', detail: 'x' } }),
  );
  const fixture = TestBed.createComponent(SubjectsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  setInputValue(fixture, '#new-subject-name', 'Direito Penal');
  submitForm(fixture, 'form');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('Já existe uma matéria com esse nome.');
});

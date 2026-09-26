import { TestBed } from '@angular/core/testing';
import { clickElement, setInputValue, submitForm, textContent } from '../../../testing/dom-testing';
import { expect, it } from 'vitest';
import { aSubject, setupSubjectsPage } from './subjects-page-harness';
import { SubjectsPage } from './subjects-page';

it('renomeia uma matéria e atualiza a linha', async () => {
  const subject = aSubject({ name: 'Direito Penal' });
  const { updateSubject } = setupSubjectsPage([subject]);
  updateSubject.mockResolvedValue({ ...subject, name: 'Direito Processual Penal' });
  const fixture = TestBed.createComponent(SubjectsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button.text-ink');
  fixture.detectChanges();
  setInputValue(fixture, 'tr input[type="text"]', 'Direito Processual Penal');
  submitForm(fixture, 'tr form');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(updateSubject).toHaveBeenCalledWith('1', { name: 'Direito Processual Penal' });
  expect(textContent(fixture, 'table')).toContain('Direito Processual Penal');
});

it('cancelar a renomeação mantém o nome original sem chamar a API', async () => {
  const subject = aSubject({ name: 'Direito Penal' });
  const { updateSubject } = setupSubjectsPage([subject]);
  const fixture = TestBed.createComponent(SubjectsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button.text-ink');
  fixture.detectChanges();
  clickElement(fixture, 'button.text-ink-muted');
  fixture.detectChanges();
  expect(updateSubject).not.toHaveBeenCalled();
  expect(textContent(fixture, 'table')).toContain('Direito Penal');
});

it('desativa uma matéria após confirmar', async () => {
  const subject = aSubject({ active: true });
  const { updateSubject } = setupSubjectsPage([subject]);
  updateSubject.mockResolvedValue({ ...subject, active: false });
  const fixture = TestBed.createComponent(SubjectsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button.ml-3');
  fixture.detectChanges();
  clickElement(fixture, 'button.text-rate-again');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(updateSubject).toHaveBeenCalledWith('1', { active: false });
  expect(textContent(fixture, 'table')).toContain('Desativada');
});

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { DecksData } from '../../../core/data/decks-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { queryElement, rootText, setInputValue, submitForm } from '../../../testing/dom-testing';
import { DeckFormPage } from './deck-form-page';

const SUBJECTS = [{ id: 's1', name: 'Direito Constitucional', active: true, changeSeq: 1 }];

function setup(create: ReturnType<typeof vi.fn>): { fixture: ReturnType<typeof TestBed.createComponent<DeckFormPage>>; navigate: ReturnType<typeof vi.fn> } {
  const navigate = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [
      { provide: DecksData, useValue: { create } },
      { provide: SubjectsData, useValue: { active: () => SUBJECTS } },
      { provide: Router, useValue: { navigate } },
    ],
  });
  const fixture = TestBed.createComponent(DeckFormPage);
  fixture.detectChanges();
  return { fixture, navigate };
}
function chooseSubject(fixture: ReturnType<typeof TestBed.createComponent<DeckFormPage>>): void {
  const select = queryElement(fixture, '#deck-subject') as HTMLSelectElement;
  select.value = 's1';
  select.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

it('TU — cria o deck e navega para a tela dele', async () => {
  const create = vi.fn().mockResolvedValue({ id: 'd1', name: 'CF/88' });
  const { fixture, navigate } = setup(create);
  chooseSubject(fixture);
  setInputValue(fixture, '#deck-name', 'CF/88');
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 's1', name: 'CF/88' }));
  expect(navigate).toHaveBeenCalledWith(['/decks', 'd1']);
});

it('TU — mostra o erro quando a criação falha', async () => {
  const create = vi.fn().mockRejectedValue(new Error('falhou'));
  const { fixture } = setup(create);
  chooseSubject(fixture);
  setInputValue(fixture, '#deck-name', 'CF/88');
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Não foi possível salvar o deck.');
});

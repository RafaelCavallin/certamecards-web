import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryElement, rootText, setInputValue, submitForm } from '../../../testing/dom-testing';
import { DeckForm } from './deck-form';

const SUBJECTS = [{ id: 's1', name: 'Direito Constitucional', active: true, changeSeq: 1 }];

it('não cria o deck sem matéria e sem nome', async () => {
  const fixture = TestBed.createComponent(DeckForm);
  fixture.componentRef.setInput('subjects', SUBJECTS);
  const handler = vi.fn();
  fixture.componentInstance.saved.subscribe(handler);
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(handler).not.toHaveBeenCalled();
});

it('emite saved com a matéria, o nome e a descrição preenchidos', async () => {
  const fixture = TestBed.createComponent(DeckForm);
  fixture.componentRef.setInput('subjects', SUBJECTS);
  const handler = vi.fn();
  fixture.componentInstance.saved.subscribe(handler);
  fixture.detectChanges();
  const select = queryElement(fixture, '#deck-subject') as HTMLSelectElement;
  select.value = 's1';
  select.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  setInputValue(fixture, '#deck-name', 'CF/88');
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(handler).toHaveBeenCalledWith({ subjectId: 's1', name: 'CF/88', description: '' });
});

it('TU — o envio continua disponível sem rede', () => {
  const fixture = TestBed.createComponent(DeckForm);
  fixture.componentRef.setInput('subjects', SUBJECTS);
  fixture.detectChanges();
  const button = queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement;
  expect(button.disabled).toBe(false);
  expect(rootText(fixture)).not.toContain('Isso precisa de conexão.');
});

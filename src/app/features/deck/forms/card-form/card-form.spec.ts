import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryElement, rootText, setInputValue, submitForm } from '../../../../testing/dom-testing';
import { CardForm } from './card-form';

function fillFrontAndBack(fixture: ReturnType<typeof TestBed.createComponent<CardForm>>): void {
  setInputValue(fixture, '#card-front', 'Qual o prazo?');
  setInputValue(fixture, '#card-back', '120 dias');
  fixture.detectChanges();
}

it('TU-12 — não salva sem pergunta ou sem resposta', async () => {
  const fixture = TestBed.createComponent(CardForm);
  const handler = vi.fn();
  fixture.componentInstance.saved.subscribe(handler);
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(handler).not.toHaveBeenCalled();
});

it('TU-12 — "Salvar e adicionar outro" emite saved e limpa o formulário', async () => {
  const fixture = TestBed.createComponent(CardForm);
  const handler = vi.fn();
  fixture.componentInstance.saved.subscribe(handler);
  fixture.detectChanges();
  fillFrontAndBack(fixture);
  submitForm(fixture);
  await fixture.whenStable();
  expect(handler).toHaveBeenCalledWith({ front: 'Qual o prazo?', back: '120 dias', source: '' });
  fixture.detectChanges();
  const front = queryElement(fixture, '#card-front') as HTMLTextAreaElement;
  expect(front.value).toBe('');
});

it('TU — Ctrl+Enter aciona o envio do formulário', async () => {
  const fixture = TestBed.createComponent(CardForm);
  const handler = vi.fn();
  fixture.componentInstance.saved.subscribe(handler);
  fixture.detectChanges();
  fillFrontAndBack(fixture);
  const form = queryElement(fixture, 'form') as HTMLFormElement;
  form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
  await fixture.whenStable();
  expect(handler).toHaveBeenCalledOnce();
});

it('TU — modo edição mostra o rótulo Salvar', () => {
  const fixture = TestBed.createComponent(CardForm);
  fixture.componentRef.setInput('initial', { front: 'Q', back: 'R', source: '' });
  fixture.detectChanges();
  const button = queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement;
  expect(button.textContent?.trim()).toBe('Salvar');
});

it('TU — desabilita o envio e mostra o aviso quando está sem rede', () => {
  const fixture = TestBed.createComponent(CardForm);
  fixture.componentRef.setInput('online', false);
  fixture.detectChanges();
  const button = queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(rootText(fixture)).toContain('Isso precisa de conexão.');
});

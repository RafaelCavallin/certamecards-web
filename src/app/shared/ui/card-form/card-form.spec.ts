import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryElement, rootText, setInputValue, submitForm } from '../../../testing/dom-testing';
import { CardForm } from './card-form';

function fillFrontAndBack(fixture: ReturnType<typeof TestBed.createComponent<CardForm>>): void {
  setInputValue(fixture, '#card-front', 'Qual o prazo?');
  setInputValue(fixture, '#card-back', '120 dias');
  fixture.detectChanges();
}

it('não salva sem pergunta ou sem resposta', async () => {
  const fixture = TestBed.createComponent(CardForm);
  const handler = vi.fn();
  fixture.componentInstance.saved.subscribe(handler);
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(handler).not.toHaveBeenCalled();
});

it('"Salvar e adicionar outro" emite saved e limpa o formulário', async () => {
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

it('TU — o envio continua disponível sem rede', () => {
  const fixture = TestBed.createComponent(CardForm);
  fixture.detectChanges();
  const button = queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement;
  expect(button.disabled).toBe(false);
  expect(rootText(fixture)).not.toContain('Isso precisa de conexão.');
});

it('TU — keepOnSave mantém o texto depois de emitir e clear() limpa por fora', async () => {
  const fixture = TestBed.createComponent(CardForm);
  fixture.componentRef.setInput('keepOnSave', true);
  fixture.detectChanges();
  fillFrontAndBack(fixture);
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  expect((queryElement(fixture, '#card-front') as HTMLTextAreaElement).value).toBe('Qual o prazo?');
  fixture.componentInstance.clear();
  fixture.detectChanges();
  expect((queryElement(fixture, '#card-front') as HTMLTextAreaElement).value).toBe('');
});

it('TU — saving desabilita os campos e o botão de envio', () => {
  const fixture = TestBed.createComponent(CardForm);
  fixture.componentRef.setInput('saving', true);
  fixture.detectChanges();
  expect((queryElement(fixture, '#card-front') as HTMLTextAreaElement).disabled).toBe(true);
  expect((queryElement(fixture, '#card-back') as HTMLTextAreaElement).disabled).toBe(true);
  expect((queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
});

it('TU — saving ignora um novo envio disparado por Ctrl+Enter', async () => {
  const fixture = TestBed.createComponent(CardForm);
  const handler = vi.fn();
  fixture.componentInstance.saved.subscribe(handler);
  fixture.componentRef.setInput('saving', true);
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(handler).not.toHaveBeenCalled();
});

it('TU — submitLabel substitui o rótulo do botão', () => {
  const fixture = TestBed.createComponent(CardForm);
  fixture.componentRef.setInput('submitLabel', 'Gravar');
  fixture.detectChanges();
  expect((queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement).textContent?.trim()).toBe('Gravar');
});

import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryAll, queryElement, rootText, setInputValue } from '../../../testing/dom-testing';
import { ErrorReportForm } from './error-report-form';
import type { ErrorReportFormPhase } from './error-report-form';

function setup(phase: ErrorReportFormPhase, errorMessage: string | null = null): {
  fixture: ReturnType<typeof TestBed.createComponent<ErrorReportForm>>;
  submitted: ReturnType<typeof vi.fn>;
  closed: ReturnType<typeof vi.fn>;
} {
  const fixture = TestBed.createComponent(ErrorReportForm);
  const submitted = vi.fn();
  const closed = vi.fn();
  fixture.componentInstance.submitted.subscribe(submitted);
  fixture.componentInstance.closed.subscribe(closed);
  fixture.componentRef.setInput('phase', phase);
  fixture.componentRef.setInput('errorMessage', errorMessage);
  fixture.detectChanges();
  return { fixture, submitted, closed };
}
function submit(fixture: ReturnType<typeof setup>['fixture']): void {
  queryElement(fixture, 'form')?.dispatchEvent(new Event('submit'));
}

it('CA-22 — mostra os quatro motivos e envia o padrão sem texto', () => {
  const { fixture, submitted } = setup('form');
  expect(queryAll(fixture, 'input[name="error-reason"]')).toHaveLength(4);
  submit(fixture);
  expect(submitted).toHaveBeenCalledWith({ reason: 'outdated_content', note: null });
});

it('CA-22 — envia o motivo escolhido e o texto aparado', () => {
  const { fixture, submitted } = setup('form');
  queryAll(fixture, 'input[name="error-reason"]')[2]?.dispatchEvent(new Event('change'));
  setInputValue(fixture, '#error-note', '  Falta o inciso II  ');
  fixture.detectChanges();
  submit(fixture);
  expect(submitted).toHaveBeenCalledWith({ reason: 'typo', note: 'Falta o inciso II' });
});

it('CA-22 — texto acima de 500 caracteres mostra erro e não envia', () => {
  const { fixture, submitted } = setup('form');
  setInputValue(fixture, '#error-note', 'a'.repeat(501));
  fixture.detectChanges();
  submit(fixture);
  expect(submitted).not.toHaveBeenCalled();
  expect(rootText(fixture)).toContain('Use até 500 caracteres.');
});

it('CA-22 — mostra a mensagem de erro do envio e desabilita Enviar enquanto envia', () => {
  const { fixture } = setup('sending', 'Isso precisa de conexão.');
  expect(rootText(fixture)).toContain('Isso precisa de conexão.');
  const send = queryAll(fixture, 'button').find((button) => button.textContent === 'Enviar') as HTMLButtonElement;
  expect(send.disabled).toBe(true);
});

it('CA-22 — "já apontado" e "enviado" mostram a mensagem e fecham', () => {
  const already = setup('already');
  expect(rootText(already.fixture)).toContain('Você já apontou um erro neste cartão');
  queryAll(already.fixture, 'button')[0]?.click();
  expect(already.closed).toHaveBeenCalledOnce();
  const sent = setup('sent');
  expect(rootText(sent.fixture)).toContain('Obrigado');
});

it('CA-22 — Cancelar fecha o formulário', () => {
  const { fixture, closed } = setup('form');
  queryAll(fixture, 'button').find((button) => button.textContent === 'Cancelar')?.click();
  expect(closed).toHaveBeenCalledOnce();
});

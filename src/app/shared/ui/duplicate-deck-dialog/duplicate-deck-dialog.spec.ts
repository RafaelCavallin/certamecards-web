import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryAll, rootText } from '../../../testing/dom-testing';
import { DuplicateDeckDialog } from './duplicate-deck-dialog';

const PROGRESS = [
  { value: true, label: 'Levar meu progresso', effect: 'Os cartões chegam com o agendamento' },
  { value: false, label: 'Começar do zero', effect: 'Todos os cartões da cópia entram como novos' },
];
const SUBSCRIPTION = [
  { value: true, label: 'Cancelar minha inscrição', effect: 'Evita estudar duas vezes' },
  { value: false, label: 'Manter a inscrição', effect: 'Você continua recebendo o oficial' },
];
const NOTICE = 'A cópia é só sua e não recebe as atualizações do deck oficial.';

function setup(subscribed: boolean): {
  fixture: ReturnType<typeof TestBed.createComponent<DuplicateDeckDialog>>;
  confirmed: ReturnType<typeof vi.fn>;
} {
  const fixture = TestBed.createComponent(DuplicateDeckDialog);
  const confirmed = vi.fn();
  fixture.componentInstance.confirmed.subscribe(confirmed);
  fixture.componentRef.setInput('progressOptions', PROGRESS);
  fixture.componentRef.setInput('subscriptionOptions', SUBSCRIPTION);
  fixture.componentRef.setInput('notice', NOTICE);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('subscribed', subscribed);
  fixture.detectChanges();
  return { fixture, confirmed };
}
function radio(fixture: ReturnType<typeof setup>['fixture'], name: string, index: number): HTMLInputElement {
  return queryAll(fixture, `input[name="${name}"]`)[index] as HTMLInputElement;
}
function confirm(fixture: ReturnType<typeof setup>['fixture']): void {
  queryAll(fixture, 'button').find((button) => button.textContent === 'Duplicar')?.click();
}

it('TU-38 — mostra a frase de cada opção e o aviso antes de confirmar', () => {
  const { fixture } = setup(true);
  const text = rootText(fixture) ?? '';
  expect(text).toContain('Os cartões chegam com o agendamento');
  expect(text).toContain('Todos os cartões da cópia entram como novos');
  expect(text).toContain('A cópia é só sua e não recebe as atualizações do deck oficial.');
});

it('TU-38 — as opções sugeridas vêm marcadas', () => {
  const { fixture } = setup(true);
  expect(radio(fixture, 'carry-progress', 0).checked).toBe(true);
  expect(radio(fixture, 'cancel-subscription', 0).checked).toBe(true);
});

it('TU-38 — trocar as opções muda o que é confirmado', () => {
  const { fixture, confirmed } = setup(true);
  radio(fixture, 'carry-progress', 1).dispatchEvent(new Event('change'));
  radio(fixture, 'cancel-subscription', 1).dispatchEvent(new Event('change'));
  confirm(fixture);
  expect(confirmed).toHaveBeenCalledWith({ carryProgress: false, cancelSubscription: false });
});

it('TU-38 — sem inscrição a pergunta não aparece e cancelSubscription vai falso', () => {
  const { fixture, confirmed } = setup(false);
  expect(queryAll(fixture, 'input[name="cancel-subscription"]')).toHaveLength(0);
  confirm(fixture);
  expect(confirmed).toHaveBeenCalledWith({ carryProgress: true, cancelSubscription: false });
});

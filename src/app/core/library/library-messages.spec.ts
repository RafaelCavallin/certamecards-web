import { HttpErrorResponse } from '@angular/common/http';
import { expect, it } from 'vitest';
import { cardLimitMessage, libraryErrorMessage, OFFLINE_MESSAGE } from './library-messages';

function httpError(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

it('TU-39 — user_card_limit vira "Este deck tem 30 cartões e você só tem espaço para 10"', () => {
  const error = httpError(422, {
    status: 422, code: 'user_card_limit', detail: 'x', requiredCards: 30, availableCards: 10,
  });
  expect(libraryErrorMessage(error)).toContain('Este deck tem 30 cartões e você só tem espaço para 10');
});

it('TU-39 — singular e ausência de espaço', () => {
  expect(cardLimitMessage(1, 0)).toContain('Este deck tem 1 cartão e você só tem espaço para 0');
});

it('TU-39 — user_card_limit sem números usa a mensagem padrão', () => {
  const error = httpError(422, { status: 422, code: 'user_card_limit', detail: 'x' });
  expect(libraryErrorMessage(error)).toContain('Não foi possível concluir');
});

it('TU — códigos conhecidos têm mensagem própria', () => {
  const error = httpError(409, { status: 409, code: 'already_subscribed', detail: 'x' });
  expect(libraryErrorMessage(error)).toBe('Você já está inscrito neste deck.');
});

it('TU — status 0 vira a mensagem de conexão e o resto, a padrão', () => {
  expect(libraryErrorMessage(httpError(0, null))).toBe(OFFLINE_MESSAGE);
  expect(libraryErrorMessage(new Error('x'))).toContain('Não foi possível concluir');
  expect(libraryErrorMessage(httpError(500, { status: 500, code: 'boom', detail: 'x' }))).toContain('Tente de novo');
});

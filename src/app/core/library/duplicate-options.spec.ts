import { expect, it } from 'vitest';
import {
  DEFAULT_DUPLICATE_CHOICE, NO_UPDATES_NOTICE, PROGRESS_OPTIONS, SUBSCRIPTION_OPTIONS, toDuplicateRequest,
} from './duplicate-options';

it('TU-38 — "levar o progresso" e "cancelar a inscrição" são as sugeridas', () => {
  expect(DEFAULT_DUPLICATE_CHOICE).toEqual({ carryProgress: true, cancelSubscription: true });
  expect(PROGRESS_OPTIONS[0]).toMatchObject({ value: true, label: 'Levar meu progresso' });
  expect(SUBSCRIPTION_OPTIONS[0]).toMatchObject({ value: true, label: 'Cancelar minha inscrição' });
});

it('TU-38 — cada opção tem uma frase de efeito', () => {
  for (const option of [...PROGRESS_OPTIONS, ...SUBSCRIPTION_OPTIONS]) {
    expect(option.effect.length).toBeGreaterThan(0);
  }
});

it('TU-38 — o aviso de que a cópia não recebe atualizações existe', () => {
  expect(NO_UPDATES_NOTICE).toContain('não recebe as atualizações');
});

it('TU-38 — a escolha vira o corpo do POST', () => {
  expect(toDuplicateRequest('n1', { carryProgress: false, cancelSubscription: true })).toEqual({
    id: 'n1', carryProgress: false, cancelSubscription: true,
  });
});

import { expect, it } from 'vitest';
import { summaryTexts } from './study-texts';

it('TU — sessão encerrada sem avaliações', () => {
  const texts = summaryTexts({ reviewed: 0, blockDone: false, cardsLeftNow: 0, uniqueCards: 0 });
  expect(texts.title).toBe('Sessão encerrada');
});

it('TU — bloco de foco concluído', () => {
  const texts = summaryTexts({ reviewed: 10, blockDone: true, cardsLeftNow: 5, uniqueCards: 8 });
  expect(texts.title).toBe('Bloco de foco concluído');
});

it('TU — pausa merecida quando encerrou com cartões restantes', () => {
  const texts = summaryTexts({ reviewed: 10, blockDone: false, cardsLeftNow: 5, uniqueCards: 8 });
  expect(texts.title).toBe('Pausa merecida');
  expect(texts.message).toContain('Ainda há 5 para agora');
});

it('TU — tudo revisado por hoje quando não sobra nada', () => {
  const texts = summaryTexts({ reviewed: 10, blockDone: false, cardsLeftNow: 0, uniqueCards: 8 });
  expect(texts.title).toBe('Tudo revisado por hoje');
  expect(texts.message).toBe('Volte amanhã para as próximas revisões.');
});

import { expect, it } from 'vitest';
import { cardsLabel, dashboardContextLine, examDateLabel, greetingForHour } from './plural';

it('TU-21 — cardsLabel usa singular para 1 cartão', () => {
  expect(cardsLabel(1)).toBe('1 cartão');
});

it('TU-21 — cardsLabel usa plural para 2 cartões', () => {
  expect(cardsLabel(2)).toBe('2 cartões');
});

it('TU-21 — examDateLabel no dia da prova', () => {
  expect(examDateLabel(0)).toBe('a prova é hoje');
});

it('TU-21 — examDateLabel na véspera da prova', () => {
  expect(examDateLabel(1)).toBe('prova amanhã');
});

it('TU-21 — examDateLabel com mais de um dia', () => {
  expect(examDateLabel(38)).toBe('prova em 38 dias');
});

it('TU-21 — greetingForHour cobre as três faixas do dia', () => {
  expect(greetingForHour(6)).toBe('Bom dia');
  expect(greetingForHour(14)).toBe('Boa tarde');
  expect(greetingForHour(20)).toBe('Boa noite');
});

it('TU-21 — dashboardContextLine sem decks', () => {
  expect(dashboardContextLine({ deckCount: 0, dueCount: 0, newCount: 0, examDaysUntil: null })).toBe(
    'Nenhum deck ainda',
  );
});

it('TU-21 — dashboardContextLine sem revisões pendentes', () => {
  const line = dashboardContextLine({ deckCount: 3, dueCount: 0, newCount: 5, examDaysUntil: null });
  expect(line).toBe('Nenhuma revisão pendente · 5 novos hoje');
});

it('TU-21 — dashboardContextLine com revisões, novos e prova', () => {
  const line = dashboardContextLine({ deckCount: 3, dueCount: 42, newCount: 1, examDaysUntil: 38 });
  expect(line).toBe('42 cartões para revisar · 1 novo hoje · prova em 38 dias');
});

import { expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import { CARD_STATE_LEARNING, CARD_STATE_NEW, CARD_STATE_REVIEW } from '../api/card-state.model';
import { buildQueue, nextCard } from './queue-builder';
import type { QueueInput, StudyCard, StudyDayWindow } from './queue.model';

const DAY: StudyDayWindow = { start: new Date('2026-09-18T07:00:00Z'), end: new Date('2026-09-19T07:00:00Z') };

function aCard(id: string, overrides: Partial<StudyCard> = {}): StudyCard {
  return { cardId: id, deckId: 'd1', subjectId: 's1', ...overrides };
}

function aState(cardId: string, overrides: Partial<CardState> = {}): CardState {
  return {
    cardId, state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1, ...overrides,
  };
}

function anInput(overrides: Partial<QueueInput> = {}): QueueInput {
  return { cards: [], states: new Map(), scope: { kind: 'all' }, newLimit: 20, reviewLimit: 9999, ...overrides };
}

it('TU-09 — buildQueue respeita a cota de novos', () => {
  const reviewCards = Array.from({ length: 40 }, (_unused, index) => aCard(`r${index}`));
  const freshCards = Array.from({ length: 30 }, (_unused, index) => aCard(`n${index}`));
  const states = new Map(reviewCards.map((card) => [card.cardId, aState(card.cardId)]));
  const input = anInput({ cards: [...reviewCards, ...freshCards], states, newLimit: 20 });
  const queue = buildQueue(input, DAY);
  expect(queue.main.length).toBe(60);
});

it('TU-10 — intercalação de 4 revisões para 1 novo', () => {
  const reviewCards = Array.from({ length: 40 }, (_unused, index) => aCard(`r${index}`));
  const freshCards = Array.from({ length: 30 }, (_unused, index) => aCard(`n${index}`));
  const states = new Map(reviewCards.map((card) => [card.cardId, aState(card.cardId)]));
  const input = anInput({ cards: [...reviewCards, ...freshCards], states, newLimit: 20 });
  const queue = buildQueue(input, DAY);
  const first25 = queue.main.slice(0, 25).map((ref) => (ref.card.cardId.startsWith('n') ? 'new' : 'review'));
  const newCount = first25.filter((kind) => kind === 'new').length;
  expect(newCount).toBe(5);
});

it('TU-11 — aprendizado vencido tem prioridade sobre a fila principal', () => {
  const learningCard = aCard('learning-1');
  const states = new Map([[learningCard.cardId, aState(learningCard.cardId, { state: CARD_STATE_LEARNING, due: '2026-09-18T07:30:00Z' })]]);
  const mainCard = aCard('main-1');
  states.set(mainCard.cardId, aState(mainCard.cardId));
  const input = anInput({ cards: [learningCard, mainCard], states });
  const queue = buildQueue(input, DAY);
  const picked = nextCard(queue, new Date('2026-09-18T08:00:00Z'));
  expect(picked.card?.cardId).toBe('learning-1');
});

it('TU-11 — adiantamento de até 20 min quando a fila principal termina', () => {
  const learningCard = aCard('learning-1');
  const states = new Map([[learningCard.cardId, aState(learningCard.cardId, { state: CARD_STATE_LEARNING, due: '2026-09-18T08:15:00Z' })]]);
  const input = anInput({ cards: [learningCard], states });
  const queue = buildQueue(input, DAY);
  const picked = nextCard(queue, new Date('2026-09-18T08:00:00Z'));
  expect(picked.card?.cardId).toBe('learning-1');
});

it('TU-11 — devolve nextAvailableAt quando o aprendizado vence em mais de 20 min', () => {
  const learningCard = aCard('learning-1');
  const states = new Map([[learningCard.cardId, aState(learningCard.cardId, { state: CARD_STATE_LEARNING, due: '2026-09-18T08:40:00Z' })]]);
  const input = anInput({ cards: [learningCard], states });
  const queue = buildQueue(input, DAY);
  const picked = nextCard(queue, new Date('2026-09-18T08:00:00Z'));
  expect(picked.card).toBeNull();
  expect(picked.nextAvailableAt?.toISOString()).toBe('2026-09-18T08:40:00.000Z');
});

it('TU-12 — filtra por deck e matéria, excluindo suspensos', () => {
  const cardInDeck = aCard('c1', { deckId: 'd1', subjectId: 's1' });
  const cardInOtherDeck = aCard('c2', { deckId: 'd2', subjectId: 's2' });
  const suspendedCard = aCard('c3', { deckId: 'd1', subjectId: 's1' });
  const states = new Map([
    [cardInDeck.cardId, aState(cardInDeck.cardId, { state: CARD_STATE_NEW })],
    [cardInOtherDeck.cardId, aState(cardInOtherDeck.cardId, { state: CARD_STATE_NEW })],
    [suspendedCard.cardId, aState(suspendedCard.cardId, { state: CARD_STATE_NEW, suspended: true })],
  ]);
  const input = anInput({ cards: [cardInDeck, cardInOtherDeck, suspendedCard], states, scope: { kind: 'deck', deckId: 'd1' } });
  const queue = buildQueue(input, DAY);
  expect(queue.main.map((ref) => ref.card.cardId)).toEqual(['c1']);
});

it('TU-14 — limite de revisões por dia corta a fila', () => {
  const reviewCards = Array.from({ length: 40 }, (_unused, index) => aCard(`r${index}`));
  const states = new Map(reviewCards.map((card) => [card.cardId, aState(card.cardId)]));
  const input = anInput({ cards: reviewCards, states, reviewLimit: 10, newLimit: 0 });
  const queue = buildQueue(input, DAY);
  expect(queue.main.length).toBe(10);
});

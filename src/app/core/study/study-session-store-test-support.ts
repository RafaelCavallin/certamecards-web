import { TestBed } from '@angular/core/testing';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import { AuthStore } from '../auth/auth-store';
import { toCardRow } from '../db/card-row';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { EventsService } from '../events/events-service';
import { StudySessionStore } from './study-session-store';

export function aDeck(): Deck {
  return {
    id: 'd1', subjectId: 's1', name: 'Deck', description: null, origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
  };
}
export function aCard(id: string): Card {
  return {
    id, deckId: 'd1', type: 'basic', front: `Pergunta ${id}`, back: `Resposta ${id}`, source: null,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
  };
}
export function aState(cardId: string): CardState {
  return {
    cardId, state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1,
  };
}
export async function setupStudySessionStore(): Promise<{ db: AccountDb; store: StudySessionStore }> {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { user: () => null } },
      { provide: EventsService, useValue: { record: (): Promise<void> => Promise.resolve() } },
    ],
  });
  const db = new AccountDb('study-session-store-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'study-session-store-test' });
  await db.decks.add(aDeck());
  await db.cards.bulkAdd([toCardRow(aCard('c1')), toCardRow(aCard('c2'))]);
  await db.cardStates.bulkAdd([aState('c1'), aState('c2')]);
  const store = TestBed.inject(StudySessionStore);
  return { db, store };
}

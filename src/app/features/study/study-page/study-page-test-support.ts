import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { vi } from 'vitest';
import { CARD_STATE_REVIEW } from '../../../core/api/card-state.model';
import type { CardState } from '../../../core/api/card-state.model';
import type { Card } from '../../../core/api/card.model';
import type { Deck } from '../../../core/api/deck.model';
import { AuthStore } from '../../../core/auth/auth-store';
import { SubjectsData } from '../../../core/data/subjects-data';
import { toCardRow } from '../../../core/db/card-row';
import { AccountDb } from '../../../core/db/account-db';
import { CurrentAccountDb } from '../../../core/db/current-account-db';
import { StudyPage } from './study-page';

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
export async function setupStudyPage(seedCards: boolean): Promise<{
  db: AccountDb;
  fixture: ReturnType<typeof TestBed.createComponent<StudyPage>>;
}> {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { user: () => null } },
      { provide: SubjectsData, useValue: { all: () => [{ id: 's1', name: 'Direito', active: true, changeSeq: 1 }] } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
    ],
  });
  const db = new AccountDb('study-page-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'study-page-test' });
  if (seedCards) {
    await db.decks.add(aDeck());
    await db.cards.bulkAdd([toCardRow(aCard('c1')), toCardRow(aCard('c2'))]);
    await db.cardStates.bulkAdd([aState('c1'), aState('c2')]);
  }
  const fixture = TestBed.createComponent(StudyPage);
  fixture.detectChanges();
  await fixture.whenStable();
  return { db, fixture };
}

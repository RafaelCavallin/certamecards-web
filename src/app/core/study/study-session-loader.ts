import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import { DEFAULT_NEW_PER_DAY } from '../data/deck-counts';
import { SettingsData } from '../data/settings-data';
import { CurrentAccountDb } from '../db/current-account-db';
import { dailyCounts } from './daily-counts';
import type { QueueInput, StudyCard, StudyDayWindow } from './queue.model';
import type { SessionScope } from './study-session.model';
import { DEFAULT_REVIEWS_PER_DAY, DEFAULT_TIME_ZONE } from './study-constants';
import { studyDayBounds } from './study-day';

export interface SessionLoadResult {
  readonly cardsById: Map<string, Card>;
  readonly statesById: Map<string, CardState>;
  readonly queueInput: QueueInput;
  readonly day: StudyDayWindow;
  readonly deviceId: string;
}
@Injectable({ providedIn: 'root' })
export class StudySessionLoader {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly settingsData = inject(SettingsData);

  async load(scope: SessionScope, now: Date): Promise<SessionLoadResult> {
    const { db } = this.currentAccountDb.require();
    const [cards, decks, states, deviceId] = await Promise.all([
      db.cards.toArray(),
      db.decks.toArray(),
      db.cardStates.toArray(),
      this.currentAccountDb.deviceId(),
    ]);
    const settings = this.settingsData.current();
    const day = studyDayBounds(now, settings?.timeZone ?? DEFAULT_TIME_ZONE);
    const deckSubject = new Map(decks.map((deck) => [deck.id, deck.subjectId]));
    const activeCards = cards.filter((card) => card.deletedAt === null && deckSubject.has(card.deckId));
    const studyCards: StudyCard[] = activeCards.map((card) => toStudyCard(card, deckSubject));
    const statesById = new Map(states.map((state) => [state.cardId, state]));
    const logs = await db.reviewLogs.where('reviewedAt').between(day.start.toISOString(), day.end.toISOString()).toArray();
    const counts = dailyCounts(logs, day);
    const newLimit = Math.max(0, (settings?.newPerDay ?? DEFAULT_NEW_PER_DAY) - counts.newCards);
    const reviewLimit = Math.max(0, (settings?.reviewsPerDay ?? DEFAULT_REVIEWS_PER_DAY) - counts.reviews);
    const queueInput: QueueInput = { cards: studyCards, states: statesById, scope, newLimit, reviewLimit };
    const cardsById = new Map(activeCards.map((card) => [card.id, card]));
    return { cardsById, statesById, queueInput, day, deviceId };
  }
}
function toStudyCard(card: Card, deckSubject: ReadonlyMap<string, string>): StudyCard {
  return { cardId: card.id, deckId: card.deckId, subjectId: deckSubject.get(card.deckId) ?? '' };
}

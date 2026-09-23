import type { Card } from './card.model';
import type { CardState } from './card-state.model';
import type { Deck } from './deck.model';
export interface DeckSubscription {
  readonly deckId: string;
  readonly subscribedAt: string;
  readonly cancelledAt: string | null;
  readonly changeSeq: number;
}
export interface LibraryDeckSummary {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly name: string;
  readonly description: string | null;
  readonly cardCount: number;
  readonly contentUpdatedAt: string;
  readonly subscribed: boolean;
}
export interface LibraryDeckPage {
  readonly items: readonly LibraryDeckSummary[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}
export interface LibrarySubject {
  readonly id: string;
  readonly name: string;
  readonly deckCount: number;
}
export interface PreviewCard {
  readonly id: string;
  readonly front: string;
  readonly back: string;
  readonly source: string | null;
}
export interface DeckPreview {
  readonly deck: LibraryDeckSummary;
  readonly cards: readonly PreviewCard[];
}
export interface SubscribeResponse {
  readonly deck: Deck;
  readonly subscription: DeckSubscription;
  readonly restoredProgress: boolean;
}
export interface DeckContentPage {
  readonly cards: readonly Card[];
  readonly cardStates: readonly CardState[];
  readonly nextAfter: string | null;
  readonly hasMore: boolean;
}
export interface DuplicateDeckRequest {
  readonly id: string;
  readonly carryProgress: boolean;
  readonly cancelSubscription: boolean;
}
export interface DuplicateDeckResponse {
  readonly deck: Deck;
  readonly copiedCards: number;
  readonly carriedStates: number;
  readonly cursorHint: number;
}
export interface LibraryQuery {
  readonly q: string;
  readonly subjectId: string | null;
  readonly page: number;
}

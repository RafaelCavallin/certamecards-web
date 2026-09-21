import type { CardState } from '../api/card-state.model';

export interface StudyCard {
  readonly cardId: string;
  readonly deckId: string;
  readonly subjectId: string;
}
export type QueueScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'deck'; readonly deckId: string }
  | { readonly kind: 'subject'; readonly subjectId: string };
export interface QueueInput {
  readonly cards: readonly StudyCard[];
  readonly states: ReadonlyMap<string, CardState>;
  readonly scope: QueueScope;
  readonly newLimit: number;
  readonly reviewLimit: number;
}
export interface StudyDayWindow {
  readonly start: Date;
  readonly end: Date;
}
export interface QueueRef {
  readonly card: StudyCard;
  readonly due: Date;
}
export interface QueueState {
  main: QueueRef[];
  learning: QueueRef[];
}
export interface NextCardResult {
  readonly card: StudyCard | null;
  readonly nextAvailableAt: Date | null;
}

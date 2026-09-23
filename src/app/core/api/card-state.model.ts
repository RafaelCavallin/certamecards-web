export const CARD_STATE_NEW = 0;
export const CARD_STATE_LEARNING = 1;
export const CARD_STATE_REVIEW = 2;
export const CARD_STATE_RELEARNING = 3;
export interface CardState {
  readonly cardId: string;
  readonly state: number;
  readonly stability: number;
  readonly difficulty: number;
  readonly due: string;
  readonly lastReview: string | null;
  readonly reps: number;
  readonly lapses: number;
  readonly learningSteps: number;
  readonly scheduledDays: number;
  readonly reviewCount: number;
  readonly suspended: boolean;
  readonly contentUpdateNote: string | null;
  readonly contentUpdatedAt: string | null;
  readonly changeSeq: number;
}

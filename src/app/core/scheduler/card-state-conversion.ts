import type { Card as FsrsCard } from 'ts-fsrs';
import type { CardState } from '../api/card-state.model';

const ROUND_PRECISION = 10_000;
function round4(value: number): number {
  return Math.round(value * ROUND_PRECISION) / ROUND_PRECISION;
}
export function toFsrsCard(state: CardState | null): Omit<FsrsCard, 'due' | 'last_review'> & {
  due: Date;
  last_review?: Date;
} {
  if (state === null) {
    throw new Error('toFsrsCard requires an existing state; use createEmptyCard for new cards');
  }
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: 0,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.lastReview !== null ? new Date(state.lastReview) : undefined,
  };
}
export function withoutTransientFields(state: CardState): Omit<CardState, 'suspended' | 'reviewCount'> {
  return {
    cardId: state.cardId,
    state: state.state,
    stability: state.stability,
    difficulty: state.difficulty,
    due: state.due,
    lastReview: state.lastReview,
    reps: state.reps,
    lapses: state.lapses,
    learningSteps: state.learningSteps,
    scheduledDays: state.scheduledDays,
    changeSeq: state.changeSeq,
  };
}
export interface FromFsrsCardMeta {
  readonly cardId: string;
  readonly reviewCount: number;
  readonly previous: CardState | null;
}
export function fromFsrsCard(card: FsrsCard, meta: FromFsrsCardMeta): CardState {
  const { cardId, reviewCount, previous } = meta;
  return {
    cardId,
    state: card.state,
    stability: round4(card.stability),
    difficulty: round4(card.difficulty),
    due: card.due.toISOString(),
    lastReview: card.last_review !== undefined ? card.last_review.toISOString() : null,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps,
    scheduledDays: card.scheduled_days,
    reviewCount,
    suspended: previous?.suspended ?? false,
    changeSeq: previous?.changeSeq ?? 0,
  };
}

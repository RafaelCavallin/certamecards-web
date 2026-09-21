import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { PreviewByRating } from '../scheduler/scheduler.model';
import type { QueueRef, QueueScope, StudyCard } from './queue.model';
import type { SessionSummary } from './session-summary';

export type SessionScope = QueueScope;
export interface StartResult {
  readonly started: boolean;
  readonly nextAvailableAt: Date | null;
}
export interface CurrentCard {
  readonly ref: StudyCard;
  readonly content: Card;
  readonly state: CardState | null;
  readonly isNew: boolean;
}
export type FinishedReason = 'completed' | 'focus_block' | 'ended_manually' | null;
export interface UndoEntry {
  readonly writtenLogId: string;
  readonly cardId: string;
  readonly previousState: CardState | null;
  readonly current: CurrentCard;
  readonly queueMain: readonly QueueRef[];
  readonly queueLearning: readonly QueueRef[];
  readonly done: number;
  readonly reviewed: number;
  readonly correct: number;
  readonly seenCardIds: readonly string[];
}
export type { PreviewByRating, SessionSummary };

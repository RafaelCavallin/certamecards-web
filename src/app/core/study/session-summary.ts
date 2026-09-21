const MINUTE_MS = 60_000;
export interface SessionSummary {
  readonly reviewed: number;
  readonly correct: number;
  readonly focusMinutes: number;
  readonly uniqueCards: number;
  readonly cardsLeftNow: number;
  readonly blockDone: boolean;
}
export interface SessionSummaryInput {
  readonly reviewed: number;
  readonly correct: number;
  readonly uniqueCardIds: ReadonlySet<string>;
  readonly elapsedMs: number;
  readonly cardsLeftNow: number;
  readonly blockDone: boolean;
}
export function buildSessionSummary(input: SessionSummaryInput): SessionSummary {
  const focusMinutes = input.reviewed > 0 ? Math.round(input.elapsedMs / MINUTE_MS) : 0;
  return {
    reviewed: input.reviewed,
    correct: input.correct,
    focusMinutes,
    uniqueCards: input.uniqueCardIds.size,
    cardsLeftNow: input.cardsLeftNow,
    blockDone: input.blockDone,
  };
}

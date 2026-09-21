export interface ReviewLog {
  readonly id: string;
  readonly cardId: string;
  readonly kind: 'review' | 'reset';
  readonly rating: number | null;
  readonly reviewedAt: string;
  readonly durationMs: number;
  readonly stateBefore: unknown;
  readonly stateAfter: unknown;
  readonly offline: boolean;
  readonly deviceId: string;
  readonly sessionId: string | null;
  readonly changeSeq: number;
}
export interface ReviewVoid {
  readonly reviewId: string;
  readonly voidedAt: string;
  readonly changeSeq: number;
}

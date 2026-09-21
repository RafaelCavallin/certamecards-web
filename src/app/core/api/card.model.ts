export interface Card {
  readonly id: string;
  readonly deckId: string;
  readonly type: string;
  readonly front: string;
  readonly back: string;
  readonly source: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly version: number;
  readonly changeSeq: number;
}
export interface CreateCardRequest {
  readonly id: string;
  readonly type: 'basic';
  readonly front: string;
  readonly back: string;
  readonly source: string | null;
}
export interface UpdateCardRequest {
  readonly front?: string;
  readonly back?: string;
  readonly source?: string | null;
}

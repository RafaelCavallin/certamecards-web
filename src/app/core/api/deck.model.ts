export type OfficialStatus = 'draft' | 'published' | 'discontinued';
export interface Deck {
  readonly id: string;
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
  readonly origin: string;
  readonly originRef: string | null;
  readonly originLabel: string | null;
  readonly officialStatus: OfficialStatus | null;
  readonly cardCount: number;
  readonly contentUpdatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly version: number;
  readonly changeSeq: number;
}
export interface CreateDeckRequest {
  readonly id: string;
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
}
export interface UpdateDeckRequest {
  readonly subjectId?: string;
  readonly name?: string;
  readonly description?: string | null;
}
export interface ResetProgressResponse {
  readonly resetCards: number;
  readonly cursorHint: number;
}

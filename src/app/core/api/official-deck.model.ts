import type { Card } from './card.model';
import type { OfficialStatus } from './deck.model';

export interface OfficialDeckAdminSummary {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: OfficialStatus;
  readonly cardCount: number;
  readonly subscriberCount: number;
  readonly openReportCount: number;
  readonly contentUpdatedAt: string | null;
  readonly version: number;
}
export interface OfficialDeckAdminPage {
  readonly items: readonly OfficialDeckAdminSummary[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}
export interface OfficialDeckFilter {
  readonly status: OfficialStatus | null;
  readonly subjectId: string | null;
  readonly page: number;
}
export interface CreateOfficialDeckRequest {
  readonly id: string;
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
}
export interface UpdateOfficialDeckRequest {
  readonly subjectId?: string;
  readonly name?: string;
  readonly description?: string | null;
}
export interface OfficialCardPage {
  readonly items: readonly Card[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}
export interface CreateOfficialCardRequest {
  readonly id: string;
  readonly type: 'basic';
  readonly front: string;
  readonly back: string;
  readonly source: string | null;
}
export interface UpdateOfficialCardRequest {
  readonly front?: string;
  readonly back?: string;
  readonly source?: string | null;
  readonly contentChanged?: boolean;
  readonly note?: string;
}
export interface UpdateOfficialCardResponse {
  readonly card: Card;
  readonly affectedSubscribers: number;
  readonly contentUpdateQueued: boolean;
}

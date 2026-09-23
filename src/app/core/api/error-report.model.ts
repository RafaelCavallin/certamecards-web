export type ErrorReportReason = 'outdated_content' | 'wrong_answer' | 'typo' | 'other';
export type ErrorReportStatus = 'open' | 'resolved' | 'rejected';
export type ErrorReportOutcome = 'resolved' | 'rejected';
export interface CreateErrorReportRequest {
  readonly reason: ErrorReportReason;
  readonly note: string | null;
}
export interface ErrorReportReceipt {
  readonly id: string;
  readonly cardId: string;
  readonly reason: ErrorReportReason;
  readonly note: string | null;
  readonly status: ErrorReportStatus;
  readonly createdAt: string;
}
export interface CardErrorReport extends ErrorReportReceipt {
  readonly deckId: string;
  readonly deckName: string;
  readonly subjectName: string;
  readonly cardFront: string;
  readonly reporterName: string;
  readonly closedAt: string | null;
  readonly closedBy: string | null;
}
export interface ErrorReportPage {
  readonly items: readonly CardErrorReport[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}
export interface ErrorReportFilter {
  readonly status: ErrorReportStatus;
  readonly page: number;
}

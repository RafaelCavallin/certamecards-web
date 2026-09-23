import { Injectable, inject, signal } from '@angular/core';
import { extractApiError } from '../api/api-error.model';
import type { CreateErrorReportRequest } from '../api/error-report.model';
import { ErrorReportsApi } from '../api/error-reports-api';
import { LocalDb } from '../db/local-db';
import { EventsService } from '../events/events-service';
import { libraryErrorMessage } from './library-messages';

export type ReportPhase = 'closed' | 'form' | 'sending' | 'already' | 'sent';
const ALREADY_SENT_CODE = 'report_already_sent';
@Injectable()
export class ErrorReportFlow {
  private readonly api = inject(ErrorReportsApi);
  private readonly localDb = inject(LocalDb);
  private readonly events = inject(EventsService);
  private cardId: string | null = null;

  readonly phase = signal<ReportPhase>('closed');
  readonly errorMessage = signal<string | null>(null);

  async open(cardId: string): Promise<void> {
    this.cardId = cardId;
    this.errorMessage.set(null);
    const reported = (await this.localDb.errorReports.get(cardId)) !== undefined;
    this.phase.set(reported ? 'already' : 'form');
  }

  async submit(request: CreateErrorReportRequest): Promise<void> {
    if (this.cardId === null) {
      return;
    }
    this.phase.set('sending');
    this.errorMessage.set(null);
    try {
      await this.api.create(this.cardId, request);
      await this.remember(this.cardId);
      await this.recordReported(this.cardId, request);
      this.phase.set('sent');
    } catch (error) {
      await this.handleFailure(this.cardId, error);
    }
  }

  close(): void {
    this.phase.set('closed');
    this.errorMessage.set(null);
  }

  private async handleFailure(cardId: string, error: unknown): Promise<void> {
    if (extractApiError(error)?.code === ALREADY_SENT_CODE) {
      await this.remember(cardId);
      this.phase.set('already');
      return;
    }
    this.errorMessage.set(libraryErrorMessage(error));
    this.phase.set('form');
  }

  private async recordReported(cardId: string, request: CreateErrorReportRequest): Promise<void> {
    const deckId = (await this.localDb.cards.get(cardId))?.deckId ?? null;
    void this.events.record('card_error_reported', { deckId, reason: request.reason });
  }

  private async remember(cardId: string): Promise<void> {
    await this.localDb.errorReports.put({ cardId, reportedAt: new Date().toISOString() });
  }
}

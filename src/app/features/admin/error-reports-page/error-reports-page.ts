import { Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { extractApiError } from '../../../core/api/api-error.model';
import type { ErrorReportOutcome, ErrorReportPage, ErrorReportStatus } from '../../../core/api/error-report.model';
import type { CardErrorReport } from '../../../core/api/error-report.model';
import { ErrorReportsApi } from '../../../core/api/error-reports-api';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { formatDatePtBr } from '../../../shared/i18n/format-date';
import { Button } from '../../../shared/ui/button/button';
import { OfflineNotice } from '../../../shared/ui/offline-notice/offline-notice';
import { ADMIN_PATHS } from '../admin-constants';
import { adminErrorMessage } from '../admin-errors';
import { AdminNav } from '../admin-nav/admin-nav';
import { REASON_LABELS, REPORT_STATUSES, REPORT_STATUS_LABELS } from './error-report-labels';

@Component({
  selector: 'app-error-reports-page',
  imports: [AdminNav, Button, OfflineNotice],
  templateUrl: './error-reports-page.html',
})
export class ErrorReportsPage {
  private readonly api = inject(ErrorReportsApi);
  private readonly router = inject(Router);
  protected readonly online = inject(ConnectivityStore).online;
  protected readonly statuses = REPORT_STATUSES;
  protected readonly statusLabels = REPORT_STATUS_LABELS;
  protected readonly reasonLabels = REASON_LABELS;
  protected readonly formatDate = formatDatePtBr;
  protected readonly status = signal<ErrorReportStatus>('open');
  protected readonly page = signal(0);
  protected readonly result = signal<ErrorReportPage | null>(null);
  protected readonly failed = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.online()) {
        untracked(() => void this.load());
      }
    });
  }

  protected onStatus(value: string): void {
    this.status.set(REPORT_STATUSES.find((item) => item === value) ?? 'open');
    this.page.set(0);
    void this.load();
  }

  protected onPage(delta: number): void {
    this.page.update((current) => current + delta);
    void this.load();
  }

  protected onOpenCard(report: CardErrorReport): void {
    void this.router.navigate([ADMIN_PATHS.officialDecks, report.deckId], { queryParams: { card: report.cardId } });
  }

  protected async onClose(report: CardErrorReport, outcome: ErrorReportOutcome): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.api.close(report.id, outcome);
      await this.load();
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      this.result.set(await this.api.list({ status: this.status(), page: this.page() }));
    } catch {
      this.failed.set(true);
    }
  }
}

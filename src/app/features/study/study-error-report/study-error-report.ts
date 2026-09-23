import { Component, inject, input } from '@angular/core';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { ErrorReportFlow } from '../../../core/library/error-report-flow';
import { Button } from '../../../shared/ui/button/button';
import { ErrorReportForm } from '../../../shared/ui/error-report-form/error-report-form';
import type { ErrorReportDraft } from '../../../shared/ui/error-report-form/error-report-form';
import { captureFocus } from '../../../shared/ui/focus-return/focus-return';
import { Sheet } from '../../../shared/ui/sheet/sheet';

@Component({
  selector: 'app-study-error-report',
  imports: [Button, ErrorReportForm, Sheet],
  providers: [ErrorReportFlow],
  templateUrl: './study-error-report.html',
})
export class StudyErrorReport {
  protected readonly flow = inject(ErrorReportFlow);
  protected readonly online = inject(ConnectivityStore).online;
  private restoreFocus: (() => void) | null = null;
  readonly cardId = input.required<string>();

  protected onOpen(): void {
    this.restoreFocus = captureFocus();
    void this.flow.open(this.cardId());
  }

  protected onSubmit(draft: ErrorReportDraft): void {
    void this.flow.submit(draft);
  }

  protected onClose(): void {
    this.flow.close();
    this.restoreFocus?.();
    this.restoreFocus = null;
  }
}

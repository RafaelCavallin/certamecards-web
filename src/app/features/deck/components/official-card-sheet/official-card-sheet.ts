import { Component, computed, inject, input, output } from '@angular/core';
import { CardStatesData } from '../../../../core/data/card-states-data';
import type { CardRow } from '../../../../core/db/local-db.model';
import { ConnectivityStore } from '../../../../core/connectivity/connectivity-store';
import { ErrorReportFlow } from '../../../../core/library/error-report-flow';
import { Button } from '../../../../shared/ui/button/button';
import { ErrorReportForm } from '../../../../shared/ui/error-report-form/error-report-form';
import type { ErrorReportDraft } from '../../../../shared/ui/error-report-form/error-report-form';
import { captureFocus } from '../../../../shared/ui/focus-return/focus-return';
import { Sheet } from '../../../../shared/ui/sheet/sheet';

@Component({
  selector: 'app-official-card-sheet',
  imports: [Button, ErrorReportForm, Sheet],
  providers: [ErrorReportFlow],
  templateUrl: './official-card-sheet.html',
})
export class OfficialCardSheet {
  private readonly cardStatesData = inject(CardStatesData);
  private restoreFocus: (() => void) | null = null;
  protected readonly flow = inject(ErrorReportFlow);
  protected readonly online = inject(ConnectivityStore).online;
  readonly open = input(false);
  readonly card = input<CardRow | undefined>(undefined);
  readonly closed = output<void>();
  protected readonly suspended = computed(
    () => this.cardStatesData.byCardId().get(this.card()?.id ?? '')?.suspended ?? false,
  );

  protected async onToggleSuspend(cardId: string): Promise<void> {
    await this.cardStatesData.setSuspension(cardId, !this.suspended());
  }

  protected onReport(cardId: string): void {
    this.restoreFocus = captureFocus();
    void this.flow.open(cardId);
  }

  protected onSubmit(draft: ErrorReportDraft): void {
    void this.flow.submit(draft);
  }

  protected onCloseReport(): void {
    this.flow.close();
    this.restoreFocus?.();
    this.restoreFocus = null;
  }
}

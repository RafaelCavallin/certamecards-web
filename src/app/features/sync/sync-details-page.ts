import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConnectivityStore } from '../../core/connectivity/connectivity-store';
import { SyncCycleCoordinator } from '../../core/sync/sync-cycle-coordinator';
import { SyncStatusStore } from '../../core/sync/sync-status-store';
import { formatDateTimePtBr } from '../../shared/i18n/format-date';
import { pluralize } from '../../shared/i18n/plural';
import { Button } from '../../shared/ui/button/button';
import { SyncIndicator } from '../../shared/ui/sync-indicator/sync-indicator';
import { SyncActionItem } from './sync-action-item/sync-action-item';

@Component({
  imports: [Button, RouterLink, SyncActionItem, SyncIndicator],
  templateUrl: './sync-details-page.html',
})
export class SyncDetailsPage {
  protected readonly statusStore = inject(SyncStatusStore);
  private readonly connectivity = inject(ConnectivityStore);
  private readonly coordinator = inject(SyncCycleCoordinator);
  protected readonly details = this.statusStore.details;
  protected readonly format = formatDateTimePtBr;
  protected readonly connectionLine = computed(() =>
    this.connectivity.online()
      ? 'Você está conectado. Suas alterações são salvas neste dispositivo e enviadas automaticamente.'
      : 'Você está sem conexão. Suas alterações ficam salvas neste dispositivo e serão enviadas quando a conexão voltar.',
  );
  protected readonly pendingLine = computed(() => {
    const count = this.details().pendingCount;
    return count === 0 ? 'Nenhuma alteração aguardando envio' : `${pluralize(count, 'alteração aguardando', 'alterações aguardando')} envio`;
  });
  protected readonly actionLine = computed(() => {
    const count = this.details().actionRequiredCount;
    return count === 0 ? 'Nenhuma alteração precisa da sua atenção' : `${pluralize(count, 'alteração precisa', 'alterações precisam')} da sua atenção`;
  });
  protected readonly canRetry = computed(() => this.connectivity.online() && this.details().pendingCount > 0);

  protected retry(): void {
    this.coordinator.retryNow();
  }
}

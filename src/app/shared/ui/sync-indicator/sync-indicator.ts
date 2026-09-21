import { Component, computed, input } from '@angular/core';

export type SyncIndicatorStatus = 'synced' | 'pending' | 'offline' | 'error';
const STATUS_LABELS: Record<SyncIndicatorStatus, string> = {
  synced: 'Sincronizado',
  pending: 'pendentes',
  offline: 'Sem conexão',
  error: 'Erro ao sincronizar',
};
@Component({
  selector: 'app-sync-indicator',
  templateUrl: './sync-indicator.html',
})
export class SyncIndicator {
  readonly status = input.required<SyncIndicatorStatus>();
  readonly pendingCount = input(0);
  protected readonly label = computed(() => this.buildLabel());

  private buildLabel(): string {
    if (this.status() === 'pending') {
      return `${this.pendingCount()} ${STATUS_LABELS.pending}`;
    }
    return STATUS_LABELS[this.status()];
  }
}

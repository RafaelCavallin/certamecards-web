import { Injectable, inject } from '@angular/core';
import { EventsService } from './events-service';
import type { SyncOperationKind } from '../sync/sync-operation.model';

@Injectable({ providedIn: 'root' })
export class SyncEvents {
  private readonly events = inject(EventsService);

  cycleStarted(pending: number): void {
    void this.events.record('sync_cycle_started', { pending });
  }

  cycleCompleted(sent: number, pending: number): void {
    void this.events.record('sync_cycle_completed', { sent, pending });
  }

  actionRequired(kind: SyncOperationKind, code: string): void {
    void this.events.record('sync_action_required', { kind, code });
  }

  conflictRestored(entityType: string, otherDeck: boolean): void {
    void this.events.record('sync_conflict_restored', { entityType, otherDeck });
  }
}

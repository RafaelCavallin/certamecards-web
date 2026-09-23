import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApi } from '../../../core/api/admin-api';
import { extractApiError } from '../../../core/api/api-error.model';
import { OfficialDecksApi } from '../../../core/api/official-decks-api';
import type { OfficialDeckAdminSummary } from '../../../core/api/official-deck.model';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { generateUuidV7 } from '../../../core/db/uuid7';
import { emptyDeckFormModel } from '../../../shared/ui/deck-form/deck-content-form';
import type { DeckFormModel } from '../../../shared/ui/deck-form/deck-content-form';
import { DeckForm } from '../../../shared/ui/deck-form/deck-form';
import type { SubjectOption } from '../../../shared/ui/deck-form/deck-form';
import { ADMIN_PATHS } from '../admin-constants';
import { adminErrorMessage } from '../admin-errors';
import { AdminNav } from '../admin-nav/admin-nav';
import { OFFICIAL_STATUS_LABELS } from '../official-status-labels';
import { OfficialDeckCards } from './official-deck-cards/official-deck-cards';
import { OfficialStatusActions } from './official-status-actions/official-status-actions';

@Component({
  selector: 'app-official-deck-editor-page',
  imports: [AdminNav, DeckForm, OfficialDeckCards, OfficialStatusActions],
  templateUrl: './official-deck-editor-page.html',
})
export class OfficialDeckEditorPage {
  private readonly api = inject(OfficialDecksApi);
  private readonly adminApi = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly online = inject(ConnectivityStore).online;
  protected readonly deckId = this.route.snapshot.paramMap.get('id');
  protected readonly openCardId = this.route.snapshot.queryParamMap.get('card');
  protected readonly statusLabels = OFFICIAL_STATUS_LABELS;
  protected readonly deck = signal<OfficialDeckAdminSummary | null>(null);
  protected readonly subjects = signal<readonly SubjectOption[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly emptyModel = emptyDeckFormModel();
  protected readonly ready = computed(() => this.deckId === null || this.deck() !== null);
  protected readonly initial = computed<DeckFormModel | undefined>(() => {
    const current = this.deck();
    return current === null
      ? undefined
      : { subjectId: current.subjectId, name: current.name, description: current.description ?? '' };
  });

  constructor() {
    void this.load();
  }

  protected async onSave(value: DeckFormModel): Promise<void> {
    this.errorMessage.set(null);
    const description = value.description === '' ? null : value.description;
    try {
      const current = this.deck();
      if (current === null) {
        const created = await this.api.create({ id: generateUuidV7(), ...value, description });
        await this.router.navigate([ADMIN_PATHS.officialDecks, created.id]);
        return;
      }
      this.deck.set(await this.api.update(current.id, current.version, { ...value, description }));
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }

  protected async refresh(): Promise<void> {
    if (this.deckId !== null) {
      this.deck.set(await this.api.get(this.deckId));
    }
  }

  protected onDeleted(): void {
    void this.router.navigate([ADMIN_PATHS.officialDecks]);
  }

  private async load(): Promise<void> {
    try {
      const subjects = await this.adminApi.listSubjects();
      this.subjects.set(subjects.filter((subject) => subject.active));
      await this.refresh();
    } catch {
      this.loadFailed.set(true);
    }
  }
}

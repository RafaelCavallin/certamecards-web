import { Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApi } from '../../../core/api/admin-api';
import type { AdminSubject } from '../../../core/api/admin.model';
import type { OfficialStatus } from '../../../core/api/deck.model';
import { OfficialDecksApi } from '../../../core/api/official-decks-api';
import type { OfficialDeckAdminPage } from '../../../core/api/official-deck.model';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { Button } from '../../../shared/ui/button/button';
import { OfficialDecksTable } from './official-decks-table';
import { OfflineNotice } from '../../../shared/ui/offline-notice/offline-notice';
import { ADMIN_PATHS } from '../admin-constants';
import { AdminNav } from '../admin-nav/admin-nav';
import { OFFICIAL_STATUSES, OFFICIAL_STATUS_LABELS } from '../official-status-labels';

@Component({
  selector: 'app-official-decks-page',
  imports: [AdminNav, Button, OfficialDecksTable, OfflineNotice],
  templateUrl: './official-decks-page.html',
})
export class OfficialDecksPage {
  private readonly api = inject(OfficialDecksApi);
  private readonly adminApi = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly online = inject(ConnectivityStore).online;
  protected readonly statuses = OFFICIAL_STATUSES;
  protected readonly statusLabels = OFFICIAL_STATUS_LABELS;
  protected readonly status = signal<OfficialStatus | null>(null);
  protected readonly subjectId = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly result = signal<OfficialDeckAdminPage | null>(null);
  protected readonly subjects = signal<readonly AdminSubject[]>([]);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (this.online()) {
        untracked(() => void this.load());
      }
    });
  }

  protected onStatus(value: string): void {
    this.status.set(OFFICIAL_STATUSES.find((item) => item === value) ?? null);
    this.resetAndLoad();
  }

  protected onSubject(value: string): void {
    this.subjectId.set(value === '' ? null : value);
    this.resetAndLoad();
  }

  protected onPage(delta: number): void {
    this.page.update((current) => current + delta);
    void this.load();
  }

  protected onNew(): void {
    void this.router.navigate([ADMIN_PATHS.officialDecks, 'novo']);
  }

  protected onOpen(deckId: string): void {
    void this.router.navigate([ADMIN_PATHS.officialDecks, deckId]);
  }

  private resetAndLoad(): void {
    this.page.set(0);
    void this.load();
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      const filter = { status: this.status(), subjectId: this.subjectId(), page: this.page() };
      const [result, subjects] = await Promise.all([this.api.list(filter), this.adminApi.listSubjects()]);
      this.result.set(result);
      this.subjects.set(subjects);
    } catch {
      this.failed.set(true);
    }
  }
}

import { Component, effect, inject, signal, untracked } from '@angular/core';
import { AdminApi } from '../../../core/api/admin-api';
import type { AdminUser } from '../../../core/api/admin.model';
import type { AdminAuditLog } from '../../../core/api/audit-log.model';
import { AuditLogApi } from '../../../core/api/audit-log-api';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { formatDatePtBr } from '../../../shared/i18n/format-date';
import { Button } from '../../../shared/ui/button/button';
import { OfflineNotice } from '../../../shared/ui/offline-notice/offline-notice';
import { AdminNav } from '../admin-nav/admin-nav';
import { ACTION_KEYS, actionLabel } from './audit-log-labels';
import { summarizeChanges } from './audit-changes';

interface Filters {
  readonly actorId: string | null;
  readonly action: string | null;
  readonly from: string | null;
  readonly to: string | null;
}
const NO_FILTERS: Filters = { actorId: null, action: null, from: null, to: null };
@Component({
  selector: 'app-audit-log-page',
  imports: [AdminNav, Button, OfflineNotice],
  templateUrl: './audit-log-page.html',
})
export class AuditLogPage {
  private readonly api = inject(AuditLogApi);
  private readonly adminApi = inject(AdminApi);
  protected readonly online = inject(ConnectivityStore).online;
  protected readonly actionKeys = ACTION_KEYS;
  protected readonly actionLabel = actionLabel;
  protected readonly summarize = summarizeChanges;
  protected readonly formatDate = formatDatePtBr;
  protected readonly admins = signal<readonly AdminUser[]>([]);
  protected readonly filters = signal<Filters>(NO_FILTERS);
  protected readonly items = signal<readonly AdminAuditLog[] | null>(null);
  protected readonly nextBefore = signal<string | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (this.online()) {
        untracked(() => void this.start());
      }
    });
  }

  protected onFilter(field: keyof Filters, value: string): void {
    this.filters.update((current) => ({ ...current, [field]: value === '' ? null : value }));
    void this.fetch(false);
  }

  protected onMore(): void {
    void this.fetch(true);
  }

  protected async fetch(append: boolean): Promise<void> {
    this.failed.set(false);
    try {
      const before = append ? this.nextBefore() : null;
      const page = await this.api.list({ ...this.filters(), before });
      this.items.set(append ? [...(this.items() ?? []), ...page.items] : page.items);
      this.nextBefore.set(page.nextBefore);
    } catch {
      this.failed.set(true);
    }
  }

  private async start(): Promise<void> {
    this.admins.set(await this.adminApi.listAdmins().catch(() => []));
    await this.fetch(false);
  }
}

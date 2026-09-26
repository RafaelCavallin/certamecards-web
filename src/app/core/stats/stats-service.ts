import { Injectable, Injector, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { DEFAULT_TIME_ZONE } from '../study/study-constants';
import { accountLiveSignal } from '../data/account-live-query';
import { SettingsData } from '../data/settings-data';
import { CurrentAccountDb } from '../db/current-account-db';
import type { CurrentAccount } from '../db/current-account-db';
import type { ReviewLogRow } from '../db/account-db.model';
import { computeLast14Days } from './last-14-days';
import type { Last14DaysStats } from './stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly settingsData = inject(SettingsData);
  private readonly injector = inject(Injector);

  private readonly reviewLogs: Signal<readonly ReviewLogRow[]> = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => this.fetchAll(account), initialValue: [],
  });

  readonly last14Days: Signal<Last14DaysStats> = computed(() =>
    computeLast14Days(this.reviewLogs(), new Date(), this.settingsData.current()?.timeZone ?? DEFAULT_TIME_ZONE),
  );

  private fetchAll(account: CurrentAccount): Promise<ReviewLogRow[]> {
    return account.db.reviewLogs.toArray();
  }
}

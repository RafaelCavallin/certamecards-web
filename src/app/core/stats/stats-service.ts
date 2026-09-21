import { Injectable, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { DEFAULT_TIME_ZONE } from '../study/study-constants';
import { SettingsData } from '../data/settings-data';
import { LocalDb } from '../db/local-db';
import type { ReviewLogRow } from '../db/local-db.model';
import { computeLast14Days } from './last-14-days';
import type { Last14DaysStats } from './stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly localDb = inject(LocalDb);
  private readonly settingsData = inject(SettingsData);

  private readonly reviewLogs: Signal<readonly ReviewLogRow[]> = toSignal(
    from(liveQuery(() => this.localDb.reviewLogs.toArray())),
    { initialValue: [] },
  );

  readonly last14Days: Signal<Last14DaysStats> = computed(() =>
    computeLast14Days(this.reviewLogs(), new Date(), this.settingsData.current()?.timeZone ?? DEFAULT_TIME_ZONE),
  );
}

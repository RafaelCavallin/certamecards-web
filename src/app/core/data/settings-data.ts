import { Injectable, Injector, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import type { UpdateUserSettingsRequest } from '../api/settings-api';
import type { UserSettings } from '../api/settings.model';
import type { AccountSettingsRow } from '../db/account-db.model';
import { CurrentAccountDb } from '../db/current-account-db';
import { SettingsMutationWriter } from '../sync/settings-mutation-writer';
import { accountLiveSignal } from './account-live-query';

@Injectable({ providedIn: 'root' })
export class SettingsData {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly settingsWriter = inject(SettingsMutationWriter);
  private readonly injector = inject(Injector);

  readonly current: Signal<AccountSettingsRow | undefined> = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => account.db.settings.get(account.userId), initialValue: undefined,
  });

  update(request: UpdateUserSettingsRequest): Promise<UserSettings> {
    return this.settingsWriter.execute({ kind: 'settings_patch', changes: request });
  }
}

import { Injectable, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import type { UpdateUserSettingsRequest } from '../api/settings-api';
import { SettingsApi } from '../api/settings-api';
import type { UserSettings } from '../api/settings.model';
import { AuthStore } from '../auth/auth-store';
import type { SettingsRow } from '../db/local-db.model';
import { LocalDb } from '../db/local-db';

@Injectable({ providedIn: 'root' })
export class SettingsData {
  private readonly localDb = inject(LocalDb);
  private readonly authStore = inject(AuthStore);
  private readonly settingsApi = inject(SettingsApi);

  readonly current: Signal<SettingsRow | undefined> = toSignal(from(liveQuery(() => this.fetchCurrent())), {
    initialValue: undefined,
  });

  async update(request: UpdateUserSettingsRequest): Promise<UserSettings> {
    const settings = await this.settingsApi.update(request);
    const userId = this.authStore.user()?.id;
    if (userId !== undefined) {
      await this.localDb.settings.put({ ...settings, userId });
    }
    return settings;
  }

  private fetchCurrent(): Promise<SettingsRow | undefined> {
    const userId = this.authStore.user()?.id;
    return userId === undefined ? Promise.resolve(undefined) : this.localDb.settings.get(userId);
  }
}

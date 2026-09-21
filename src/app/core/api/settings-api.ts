import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { UserSettings } from './settings.model';

const SETTINGS_URL = `${environment.apiBaseUrl}/me/settings`;
export type UpdateUserSettingsRequest = Omit<UserSettings, 'changeSeq'>;
@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);

  get(): Promise<UserSettings> {
    return firstValueFrom(this.http.get<UserSettings>(SETTINGS_URL));
  }

  update(request: UpdateUserSettingsRequest): Promise<UserSettings> {
    return firstValueFrom(this.http.put<UserSettings>(SETTINGS_URL, request));
  }
}

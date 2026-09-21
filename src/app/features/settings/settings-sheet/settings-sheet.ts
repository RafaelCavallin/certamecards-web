import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormField, submit } from '@angular/forms/signals';
import { AuthApi } from '../../../core/api/auth-api';
import { AuthStore } from '../../../core/auth/auth-store';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { SettingsData } from '../../../core/data/settings-data';
import { ThemeService } from '../../../core/theme/theme-service';
import { Button } from '../../../shared/ui/button/button';
import { OfflineNotice } from '../../../shared/ui/offline-notice/offline-notice';
import { Sheet } from '../../../shared/ui/sheet/sheet';
import { DEFAULT_NEW_PER_DAY, DEFAULT_REVIEWS_PER_DAY, buildSettingsForm, emptySettingsFormModel } from './settings-content-form';
import type { SettingsFormModel } from './settings-content-form';

@Component({
  selector: 'app-settings-sheet',
  imports: [Sheet, FormField, Button, OfflineNotice],
  templateUrl: './settings-sheet.html',
})
export class SettingsSheet {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly settingsData = inject(SettingsData);
  private readonly themeService = inject(ThemeService);
  protected readonly connectivity = inject(ConnectivityStore);

  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  protected readonly timeZones = Intl.supportedValuesOf('timeZone');
  protected readonly submitting = signal(false);
  protected readonly model = signal(emptySettingsFormModel());
  protected readonly settingsForm = buildSettingsForm(this.model);
  private originalTheme = this.model().theme;

  constructor() {
    effect(() => this.themeService.apply(this.model().theme));
    effect(() => {
      if (this.open()) {
        this.loadModel();
      }
    });
  }

  protected onSubmit(): void {
    void submit(this.settingsForm, async () => {
      await this.save();
    });
  }

  protected onCancel(): void {
    this.model.set({ ...this.model(), theme: this.originalTheme });
    this.closed.emit();
  }

  private loadModel(): void {
    const settings = this.settingsData.current();
    const defaults = emptySettingsFormModel();
    const loaded: SettingsFormModel = {
      displayName: this.authStore.user()?.displayName ?? defaults.displayName,
      newPerDay: settings?.newPerDay ?? DEFAULT_NEW_PER_DAY,
      reviewsPerDay: settings?.reviewsPerDay ?? DEFAULT_REVIEWS_PER_DAY,
      focusMinutes: settings?.focusMinutes ?? defaults.focusMinutes,
      examDate: settings?.examDate ?? defaults.examDate,
      timeZone: settings?.timeZone ?? defaults.timeZone,
      theme: settings?.theme ?? defaults.theme,
    };
    this.originalTheme = loaded.theme;
    this.model.set(loaded);
  }

  private async save(): Promise<void> {
    this.submitting.set(true);
    try {
      const value = this.model();
      await this.settingsData.update({
        newPerDay: value.newPerDay,
        reviewsPerDay: value.reviewsPerDay,
        focusMinutes: value.focusMinutes,
        examDate: value.examDate === '' ? null : value.examDate,
        timeZone: value.timeZone,
        theme: value.theme,
      });
      this.authStore.updateUser(await this.authApi.updateDisplayName({ displayName: value.displayName }));
      this.originalTheme = value.theme;
      this.closed.emit();
    } finally {
      this.submitting.set(false);
    }
  }
}

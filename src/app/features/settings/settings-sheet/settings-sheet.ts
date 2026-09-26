import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormField, submit } from '@angular/forms/signals';
import { AuthStore } from '../../../core/auth/auth-store';
import { SettingsData } from '../../../core/data/settings-data';
import { ProfileMutationWriter } from '../../../core/sync/profile-mutation-writer';
import { ThemeService } from '../../../core/theme/theme-service';
import { Button } from '../../../shared/ui/button/button';
import { Sheet } from '../../../shared/ui/sheet/sheet';
import { DEFAULT_NEW_PER_DAY, DEFAULT_REVIEWS_PER_DAY, buildSettingsForm, emptySettingsFormModel } from './settings-content-form';
import type { SettingsFormModel } from './settings-content-form';

@Component({
  selector: 'app-settings-sheet',
  imports: [Sheet, FormField, Button],
  templateUrl: './settings-sheet.html',
})
export class SettingsSheet {
  private readonly authStore = inject(AuthStore);
  private readonly settingsData = inject(SettingsData);
  private readonly profileWriter = inject(ProfileMutationWriter);
  private readonly themeService = inject(ThemeService);

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
      await this.saveDisplayName(value.displayName);
      this.originalTheme = value.theme;
      this.closed.emit();
    } finally {
      this.submitting.set(false);
    }
  }

  private async saveDisplayName(displayName: string): Promise<void> {
    const user = this.authStore.user();
    if (user === null || user.displayName === displayName) {
      return;
    }
    await this.profileWriter.execute({ kind: 'profile_patch', displayName });
    this.authStore.updateUser({ ...user, displayName });
  }
}

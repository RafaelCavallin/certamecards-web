import { Injectable, effect, inject } from '@angular/core';
import type { Theme } from '../api/settings.model';
import { SettingsData } from '../data/settings-data';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly settingsData = inject(SettingsData);

  constructor() {
    effect(() => {
      const settings = this.settingsData.current();
      if (settings !== undefined) {
        this.apply(settings.theme);
      }
    });
  }

  apply(theme: Theme): void {
    if (theme === 'auto') {
      delete document.documentElement.dataset['theme'];
      return;
    }
    document.documentElement.dataset['theme'] = theme;
  }
}

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-offline-notice',
  template: `
    @if (!online()) {
      <p class="text-sm text-ink-muted" role="status">Isso precisa de conexão.</p>
    }
  `,
})
export class OfflineNotice {
  readonly online = input.required<boolean>();
}

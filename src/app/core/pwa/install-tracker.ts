import { Injectable, inject } from '@angular/core';
import { EventsService } from '../events/events-service';

@Injectable({ providedIn: 'root' })
export class InstallTracker {
  private readonly eventsService = inject(EventsService);

  listen(): void {
    window.addEventListener('appinstalled', () => void this.eventsService.record('pwa_installed', {}));
  }
}

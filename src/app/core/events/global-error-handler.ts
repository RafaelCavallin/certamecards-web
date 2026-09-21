import type { ErrorHandler } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EventsService } from './events-service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly eventsService = inject(EventsService);
  private readonly router = inject(Router);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    void this.eventsService
      .record('client_error', { message, route: this.router.url, appVersion: environment.appVersion })
      .catch(() => undefined);
  }
}

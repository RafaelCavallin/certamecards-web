import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ProductEvent } from '../events/event.model';

const EVENTS_URL = `${environment.apiBaseUrl}/events`;
@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly http = inject(HttpClient);

  submit(events: readonly ProductEvent[]): Promise<void> {
    return firstValueFrom(this.http.post<void>(EVENTS_URL, { events }));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CreateDeckRequest, Deck, ResetProgressResponse, UpdateDeckRequest } from './deck.model';

const DECKS_BASE = `${environment.apiBaseUrl}/decks`;
@Injectable({ providedIn: 'root' })
export class DecksApi {
  private readonly http = inject(HttpClient);

  create(request: CreateDeckRequest): Promise<Deck> {
    return firstValueFrom(this.http.post<Deck>(DECKS_BASE, request));
  }

  update(id: string, ifMatch: number, request: UpdateDeckRequest): Promise<Deck> {
    return firstValueFrom(
      this.http.patch<Deck>(`${DECKS_BASE}/${id}`, request, { headers: { 'If-Match': `${ifMatch}` } }),
    );
  }

  delete(id: string, ifMatch: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${DECKS_BASE}/${id}`, { headers: { 'If-Match': `${ifMatch}` } }),
    );
  }

  resetProgress(id: string): Promise<ResetProgressResponse> {
    return firstValueFrom(this.http.post<ResetProgressResponse>(`${DECKS_BASE}/${id}/reset-progress`, {}));
  }
}

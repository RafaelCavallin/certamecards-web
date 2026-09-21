import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CardState } from './card-state.model';
import type { Card, CreateCardRequest, UpdateCardRequest } from './card.model';
import type { ReviewLog, ReviewVoid } from './review-log.model';

const CARDS_BASE = `${environment.apiBaseUrl}/cards`;
export interface CardHistory {
  readonly reviewLogs: readonly ReviewLog[];
  readonly reviewVoids: readonly ReviewVoid[];
}
@Injectable({ providedIn: 'root' })
export class CardsApi {
  private readonly http = inject(HttpClient);

  create(deckId: string, request: CreateCardRequest): Promise<Card> {
    return firstValueFrom(this.http.post<Card>(`${environment.apiBaseUrl}/decks/${deckId}/cards`, request));
  }

  update(id: string, ifMatch: number, request: UpdateCardRequest): Promise<Card> {
    return firstValueFrom(
      this.http.patch<Card>(`${CARDS_BASE}/${id}`, request, { headers: { 'If-Match': `${ifMatch}` } }),
    );
  }

  delete(id: string, ifMatch: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${CARDS_BASE}/${id}`, { headers: { 'If-Match': `${ifMatch}` } }),
    );
  }

  setSuspension(id: string, suspended: boolean): Promise<CardState> {
    return firstValueFrom(this.http.put<CardState>(`${CARDS_BASE}/${id}/suspension`, { suspended }));
  }

  history(id: string): Promise<CardHistory> {
    return firstValueFrom(this.http.get<CardHistory>(`${CARDS_BASE}/${id}/reviews`));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { OfficialStatus } from './deck.model';
import type {
  CreateOfficialCardRequest,
  CreateOfficialDeckRequest,
  OfficialCardPage,
  OfficialDeckAdminPage,
  OfficialDeckAdminSummary,
  OfficialDeckFilter,
  UpdateOfficialCardRequest,
  UpdateOfficialCardResponse,
  UpdateOfficialDeckRequest,
} from './official-deck.model';
import type { Card } from './card.model';
import { toQueryParams } from './query-params';

const DECKS_BASE = `${environment.apiBaseUrl}/admin/official-decks`;
const CARDS_BASE = `${environment.apiBaseUrl}/admin/official-cards`;
function ifMatch(version: number): { headers: { 'If-Match': string } } {
  return { headers: { 'If-Match': `${version}` } };
}
@Injectable({ providedIn: 'root' })
export class OfficialDecksApi {
  private readonly http = inject(HttpClient);

  list(filter: OfficialDeckFilter): Promise<OfficialDeckAdminPage> {
    const params = toQueryParams({ ...filter });
    return firstValueFrom(this.http.get<OfficialDeckAdminPage>(DECKS_BASE, { params }));
  }

  get(id: string): Promise<OfficialDeckAdminSummary> {
    return firstValueFrom(this.http.get<OfficialDeckAdminSummary>(`${DECKS_BASE}/${id}`));
  }

  create(request: CreateOfficialDeckRequest): Promise<OfficialDeckAdminSummary> {
    return firstValueFrom(this.http.post<OfficialDeckAdminSummary>(DECKS_BASE, request));
  }

  update(id: string, version: number, request: UpdateOfficialDeckRequest): Promise<OfficialDeckAdminSummary> {
    return firstValueFrom(this.http.patch<OfficialDeckAdminSummary>(`${DECKS_BASE}/${id}`, request, ifMatch(version)));
  }

  delete(id: string, version: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${DECKS_BASE}/${id}`, ifMatch(version)));
  }

  changeStatus(id: string, version: number, status: OfficialStatus): Promise<OfficialDeckAdminSummary> {
    return firstValueFrom(
      this.http.put<OfficialDeckAdminSummary>(`${DECKS_BASE}/${id}/status`, { status }, ifMatch(version)),
    );
  }

  listCards(deckId: string, page: number): Promise<OfficialCardPage> {
    return firstValueFrom(this.http.get<OfficialCardPage>(`${DECKS_BASE}/${deckId}/cards`, { params: { page } }));
  }

  createCard(deckId: string, request: CreateOfficialCardRequest): Promise<Card> {
    return firstValueFrom(this.http.post<Card>(`${DECKS_BASE}/${deckId}/cards`, request));
  }

  updateCard(id: string, version: number, request: UpdateOfficialCardRequest): Promise<UpdateOfficialCardResponse> {
    return firstValueFrom(
      this.http.patch<UpdateOfficialCardResponse>(`${CARDS_BASE}/${id}`, request, ifMatch(version)),
    );
  }

  deleteCard(id: string, version: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${CARDS_BASE}/${id}`, ifMatch(version)));
  }
}

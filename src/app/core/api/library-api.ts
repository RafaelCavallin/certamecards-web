import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  DeckContentPage,
  DeckPreview,
  DuplicateDeckRequest,
  DuplicateDeckResponse,
  LibraryDeckPage,
  LibraryDeckSummary,
  LibraryQuery,
  LibrarySubject,
  SubscribeResponse,
} from './library.model';
import { toQueryParams } from './query-params';

const LIBRARY_BASE = `${environment.apiBaseUrl}/library`;
export const CONTENT_PAGE_LIMIT = 500;
@Injectable({ providedIn: 'root' })
export class LibraryApi {
  private readonly http = inject(HttpClient);

  list(query: LibraryQuery): Promise<LibraryDeckPage> {
    const params = toQueryParams({ q: query.q, subjectId: query.subjectId, page: query.page });
    return firstValueFrom(this.http.get<LibraryDeckPage>(`${LIBRARY_BASE}/decks`, { params }));
  }

  async subjects(): Promise<readonly LibrarySubject[]> {
    const body = await firstValueFrom(this.http.get<{ items: readonly LibrarySubject[] }>(`${LIBRARY_BASE}/subjects`));
    return body.items;
  }

  async suggestions(limit: number): Promise<readonly LibraryDeckSummary[]> {
    const body = await firstValueFrom(
      this.http.get<{ items: readonly LibraryDeckSummary[] }>(`${LIBRARY_BASE}/suggestions`, { params: { limit } }),
    );
    return body.items;
  }

  preview(deckId: string): Promise<DeckPreview> {
    return firstValueFrom(this.http.get<DeckPreview>(`${LIBRARY_BASE}/decks/${deckId}/preview`));
  }

  subscribe(deckId: string): Promise<SubscribeResponse> {
    return firstValueFrom(this.http.post<SubscribeResponse>(`${LIBRARY_BASE}/decks/${deckId}/subscription`, {}));
  }

  unsubscribe(deckId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${LIBRARY_BASE}/decks/${deckId}/subscription`));
  }

  content(deckId: string, after: string | null): Promise<DeckContentPage> {
    const params = toQueryParams({ after, limit: CONTENT_PAGE_LIMIT });
    return firstValueFrom(this.http.get<DeckContentPage>(`${LIBRARY_BASE}/decks/${deckId}/content`, { params }));
  }

  duplicate(deckId: string, request: DuplicateDeckRequest): Promise<DuplicateDeckResponse> {
    return firstValueFrom(
      this.http.post<DuplicateDeckResponse>(`${LIBRARY_BASE}/decks/${deckId}/duplicate`, request),
    );
  }
}

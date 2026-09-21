import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CardReviewHistory, ChangesPage, ReviewPushRequest, ReviewPushResult } from './sync.model';

const SYNC_BASE = `${environment.apiBaseUrl}/sync`;
const CARDS_BASE = `${environment.apiBaseUrl}/cards`;
@Injectable({ providedIn: 'root' })
export class SyncApi {
  private readonly http = inject(HttpClient);

  changes(cursor: number, limit: number): Promise<ChangesPage> {
    return firstValueFrom(
      this.http.get<ChangesPage>(`${SYNC_BASE}/changes`, { params: { cursor, limit } }),
    );
  }

  pushReviews(request: ReviewPushRequest): Promise<ReviewPushResult> {
    return firstValueFrom(this.http.post<ReviewPushResult>(`${SYNC_BASE}/reviews`, request));
  }

  cardReviews(cardId: string): Promise<CardReviewHistory> {
    return firstValueFrom(this.http.get<CardReviewHistory>(`${CARDS_BASE}/${cardId}/reviews`));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CardReviewHistory,
  ChangesPage,
  ConflictDetail,
  ReviewPushRequest,
  ReviewPushResult,
  SyncMutationRequest,
  SyncMutationResponse,
} from './sync.model';

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

  mutate(request: SyncMutationRequest): Promise<SyncMutationResponse> {
    return firstValueFrom(this.http.post<SyncMutationResponse>(`${SYNC_BASE}/mutations`, request));
  }

  pushReviews(request: ReviewPushRequest): Promise<ReviewPushResult> {
    return firstValueFrom(this.http.post<ReviewPushResult>(`${SYNC_BASE}/reviews`, request));
  }

  cardReviews(cardId: string, cursor: string | null = null, limit?: number): Promise<CardReviewHistory> {
    const params: Record<string, string | number> = {};
    if (cursor !== null) {
      params['cursor'] = cursor;
    }
    if (limit !== undefined) {
      params['limit'] = limit;
    }
    return firstValueFrom(this.http.get<CardReviewHistory>(`${CARDS_BASE}/${cardId}/reviews`, { params }));
  }

  conflictDetail(id: string): Promise<ConflictDetail> {
    return firstValueFrom(this.http.get<ConflictDetail>(`${SYNC_BASE}/conflicts/${id}`));
  }
}

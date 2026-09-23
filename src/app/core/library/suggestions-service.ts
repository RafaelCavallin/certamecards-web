import { Injectable, inject } from '@angular/core';
import type { LibraryDeckSummary } from '../api/library.model';
import { LibraryApi } from '../api/library-api';
import { ConnectivityStore } from '../connectivity/connectivity-store';

export const MAX_SUGGESTIONS = 3;
export function pickSuggestions(decks: readonly LibraryDeckSummary[]): readonly LibraryDeckSummary[] {
  const bySubject = new Map<string, LibraryDeckSummary>();
  for (const deck of decks) {
    if (!deck.subscribed && !bySubject.has(deck.subjectId)) {
      bySubject.set(deck.subjectId, deck);
    }
  }
  return [...bySubject.values()].slice(0, MAX_SUGGESTIONS);
}
@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private readonly api = inject(LibraryApi);
  private readonly connectivity = inject(ConnectivityStore);

  async load(): Promise<readonly LibraryDeckSummary[]> {
    if (!this.connectivity.online()) {
      return [];
    }
    try {
      return pickSuggestions(await this.api.suggestions(MAX_SUGGESTIONS));
    } catch {
      return [];
    }
  }
}

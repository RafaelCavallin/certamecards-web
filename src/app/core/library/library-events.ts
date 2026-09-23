import { Injectable, inject } from '@angular/core';
import { EventsService } from '../events/events-service';

export interface SearchEventInput {
  readonly term: string;
  readonly subjectId: string | null;
  readonly resultCount: number;
}
@Injectable({ providedIn: 'root' })
export class LibraryEvents {
  private readonly events = inject(EventsService);

  searched(input: SearchEventInput): void {
    const hasQuery = input.term.trim() !== '';
    const hasSubject = input.subjectId !== null;
    if (hasQuery || hasSubject) {
      void this.events.record('library_searched', { hasQuery, hasSubject, resultCount: input.resultCount });
    }
  }

  previewOpened(deckId: string): void {
    void this.events.record('deck_preview_opened', { deckId });
  }
}

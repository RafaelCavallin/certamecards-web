import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { LibraryApi } from '../../core/api/library-api';
import type { DeckPreview, LibraryDeckPage, LibraryDeckSummary } from '../../core/api/library.model';
import { ConnectivityStore } from '../../core/connectivity/connectivity-store';
import { EventsService } from '../../core/events/events-service';
import { SubscriptionService } from '../../core/library/subscription-service';

export function aSummary(overrides: Partial<LibraryDeckSummary> = {}): LibraryDeckSummary {
  return {
    id: 'd1', subjectId: 's1', subjectName: 'Direito Constitucional', name: 'CF/88 — princípios',
    description: 'Fundamentos e objetivos.', cardCount: 12, contentUpdatedAt: '2026-09-19T14:02:00Z',
    subscribed: false, ...overrides,
  };
}
export function aPage(items: readonly LibraryDeckSummary[], overrides: Partial<LibraryDeckPage> = {}): LibraryDeckPage {
  return { items, page: 0, size: 20, total: items.length, ...overrides };
}
export function aPreview(deck: LibraryDeckSummary = aSummary(), cardCount = 10): DeckPreview {
  const cards = Array.from({ length: cardCount }, (_, index) => ({
    id: `c${index}`, front: `Frente ${index}`, back: `Verso ${index}`, source: index === 0 ? 'CF/88, art. 1º' : null,
  }));
  return { deck, cards };
}
export interface LibraryMocks {
  readonly api: Record<'list' | 'subjects' | 'preview', ReturnType<typeof vi.fn>>;
  readonly subscriptions: Record<'subscribe' | 'duplicate', ReturnType<typeof vi.fn>>;
  readonly navigate: ReturnType<typeof vi.fn>;
  readonly record: ReturnType<typeof vi.fn>;
  readonly online: WritableSignal<boolean>;
}
export function libraryProviders(online = true, deckParam: string | null = null): {
  mocks: LibraryMocks;
  providers: readonly unknown[];
} {
  const mocks: LibraryMocks = {
    api: {
      list: vi.fn().mockResolvedValue(aPage([aSummary()])),
      subjects: vi.fn().mockResolvedValue([{ id: 's1', name: 'Direito Constitucional', deckCount: 1 }]),
      preview: vi.fn().mockResolvedValue(aPreview()),
    },
    subscriptions: { subscribe: vi.fn(), duplicate: vi.fn() },
    navigate: vi.fn().mockResolvedValue(true),
    record: vi.fn(),
    online: signal(online),
  };
  const params = convertToParamMap(deckParam === null ? {} : { deck: deckParam });
  const providers = [
    { provide: LibraryApi, useValue: mocks.api },
    { provide: SubscriptionService, useValue: mocks.subscriptions },
    { provide: ConnectivityStore, useValue: { online: mocks.online } },
    { provide: EventsService, useValue: { record: mocks.record } },
    { provide: Router, useValue: { navigate: mocks.navigate } },
    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params } } },
  ];
  return { mocks, providers };
}

import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import type { Card } from '../../core/api/card.model';
import type { OfficialDeckAdminSummary } from '../../core/api/official-deck.model';
import { ConnectivityStore } from '../../core/connectivity/connectivity-store';

export function aDeckSummary(overrides: Partial<OfficialDeckAdminSummary> = {}): OfficialDeckAdminSummary {
  return {
    id: 'd1', subjectId: 's1', subjectName: 'Direito Constitucional', name: 'CF/88', description: null,
    status: 'published', cardCount: 12, subscriberCount: 120, openReportCount: 2,
    contentUpdatedAt: '2026-09-19T14:02:00Z', version: 4, ...overrides,
  };
}
export function anOfficialCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Fundamentos da República', back: 'Soberania…', source: 'CF/88, art. 1º',
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 3, changeSeq: 5,
    ...overrides,
  };
}
export function aPageOf<T>(items: readonly T[], overrides: Record<string, number> = {}): {
  items: readonly T[]; page: number; size: number; total: number;
} {
  return { items, page: 0, size: 20, total: items.length, ...overrides };
}
export function spyNavigate(): ReturnType<typeof vi.fn> {
  return vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
}
export interface RoutingMocks {
  readonly online: WritableSignal<boolean>;
  readonly providers: readonly unknown[];
}
export function routingMocks(params: Record<string, string> = {}, query: Record<string, string> = {}): RoutingMocks {
  const online = signal(true);
  const snapshot = { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) };
  const providers = [
    provideRouter([]),
    { provide: ActivatedRoute, useValue: { snapshot } },
    { provide: ConnectivityStore, useValue: { online } },
  ];
  return { online, providers };
}

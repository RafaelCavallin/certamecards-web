import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import type { AuthUser } from '../../../core/api/auth.model';
import type { Deck } from '../../../core/api/deck.model';
import type { Subject } from '../../../core/api/subject.model';
import { AuthStore } from '../../../core/auth/auth-store';
import { CardStatesData } from '../../../core/data/card-states-data';
import { CardsData } from '../../../core/data/cards-data';
import { LocalDb } from '../../../core/db/local-db';
import { DecksData } from '../../../core/data/decks-data';
import { SettingsData } from '../../../core/data/settings-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { SyncService } from '../../../core/sync/sync-service';
import { DashboardPage } from './dashboard-page';

export function aDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1',
    subjectId: 's1',
    name: 'CF/88',
    description: null,
    origin: 'own',
    originRef: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    deletedAt: null,
    version: 1,
    changeSeq: 1,
    ...overrides,
  };
}
export function aUser(displayName: string): AuthUser {
  return { id: 'u1', email: 'a@a.com', displayName, role: 'candidate', termsAccepted: true };
}
export interface CardRowLike {
  readonly id: string;
  readonly deckId: string;
}
export interface SetupOptions {
  readonly decks?: readonly Deck[];
  readonly subjects?: readonly Subject[];
  readonly user?: AuthUser;
  readonly cards?: readonly CardRowLike[];
}
export function setupDashboard(
  options: SetupOptions = {},
): { fixture: ReturnType<typeof TestBed.createComponent<DashboardPage>>; navigate: ReturnType<typeof vi.fn> } {
  const navigate = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { user: () => options.user ?? aUser('Ana Souza') } },
      { provide: DecksData, useValue: { active: () => options.decks ?? [] } },
      { provide: CardsData, useValue: { allActive: () => options.cards ?? [] } },
      { provide: CardStatesData, useValue: { byCardId: () => new Map() } },
      { provide: SettingsData, useValue: { current: () => undefined } },
      { provide: SubjectsData, useValue: { active: () => options.subjects ?? [], all: () => options.subjects ?? [] } },
      { provide: Router, useValue: { navigate } },
      { provide: SyncService, useValue: { status: () => 'synced', pendingCount: () => 0, flush: () => Promise.resolve() } },
      { provide: LocalDb, useValue: { clearAllLocalData: () => Promise.resolve() } },
    ],
  });
  const fixture = TestBed.createComponent(DashboardPage);
  fixture.detectChanges();
  return { fixture, navigate };
}

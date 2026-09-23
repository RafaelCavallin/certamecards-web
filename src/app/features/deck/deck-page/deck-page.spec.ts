import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import type { Deck } from '../../../core/api/deck.model';
import { CardStatesData } from '../../../core/data/card-states-data';
import { CardsData } from '../../../core/data/cards-data';
import { DecksData } from '../../../core/data/decks-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { queryElement, rootText } from '../../../testing/dom-testing';
import { DeckPage } from './deck-page';

function aDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 1,
    changeSeq: 1, ...overrides,
  };
}
function setup(deck: Deck | undefined): ReturnType<typeof TestBed.createComponent<DeckPage>> {
  TestBed.configureTestingModule({
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'd1']]) } } },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      { provide: DecksData, useValue: { watchById: () => () => deck } },
      { provide: CardsData, useValue: { byDeck: () => () => [] } },
      { provide: CardStatesData, useValue: { byCardId: () => new Map() } },
      {
        provide: SubjectsData,
        useValue: { active: () => [], all: () => [{ id: 's1', name: 'Direito', active: true, changeSeq: 1 }] },
      },
      { provide: ConnectivityStore, useValue: { online: () => true } },
    ],
  });
  const fixture = TestBed.createComponent(DeckPage);
  fixture.detectChanges();
  return fixture;
}

it('TU — mostra o nome e a matéria do deck', () => {
  const fixture = setup(aDeck());
  const text = rootText(fixture);
  expect(text).toContain('CF/88');
  expect(text).toContain('Direito');
});

it('TU — não renderiza a tela enquanto o deck não é encontrado', () => {
  const fixture = setup(undefined);
  expect(queryElement(fixture, 'app-deck-header')).toBeNull();
});

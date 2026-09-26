import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import type { Deck } from '../../../core/api/deck.model';
import { CardStatesData } from '../../../core/data/card-states-data';
import { CardsData } from '../../../core/data/cards-data';
import { DecksData } from '../../../core/data/decks-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { queryAll } from '../../../testing/dom-testing';
import { DeckPage } from './deck-page';

type DeckPageFixture = ReturnType<typeof TestBed.createComponent<DeckPage>>;
const DECK: Deck = {
  id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
};
function dialogByTitle(fixture: DeckPageFixture, title: string): HTMLElement {
  const dialog = queryAll(fixture, 'dialog').find((element) => element.textContent?.includes(title));
  if (dialog === undefined) {
    throw new Error(`dialog "${title}" não encontrado`);
  }
  return dialog;
}
function headerButton(fixture: DeckPageFixture, label: string): HTMLElement {
  const button = queryAll(fixture, 'app-deck-header button').find((element) => element.textContent?.trim() === label);
  if (button === undefined) {
    throw new Error(`botão "${label}" não encontrado`);
  }
  return button;
}
function setup(): {
  fixture: DeckPageFixture;
  decksData: { update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; resetProgress: ReturnType<typeof vi.fn> };
  navigate: ReturnType<typeof vi.fn>;
} {
  const navigate = vi.fn().mockResolvedValue(true);
  const decksData = {
    watchById: () => () => DECK,
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    resetProgress: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'd1']]) } } },
      { provide: Router, useValue: { navigate } },
      { provide: DecksData, useValue: decksData },
      { provide: CardsData, useValue: { byDeck: () => () => [] } },
      { provide: CardStatesData, useValue: { byCardId: () => new Map() } },
      { provide: SubjectsData, useValue: { active: () => [], all: () => [] } },
      { provide: ConnectivityStore, useValue: { online: () => true } },
    ],
  });
  const fixture = TestBed.createComponent(DeckPage);
  fixture.detectChanges();
  return { fixture, decksData, navigate };
}

it('confirmar zerar progresso aciona resetProgress', async () => {
  const { fixture, decksData } = setup();
  headerButton(fixture, 'Zerar progresso').click();
  fixture.detectChanges();
  const dialog = dialogByTitle(fixture, 'Zerar progresso');
  dialog.querySelectorAll('button')[1]?.click();
  await fixture.whenStable();
  expect(decksData.resetProgress).toHaveBeenCalledWith('d1');
});

it('confirmar excluir deck aciona delete e navega para o painel', async () => {
  const { fixture, decksData, navigate } = setup();
  headerButton(fixture, 'Excluir').click();
  fixture.detectChanges();
  const dialog = dialogByTitle(fixture, 'Excluir deck');
  dialog.querySelectorAll('button')[1]?.click();
  await fixture.whenStable();
  expect(decksData.delete).toHaveBeenCalledWith('d1');
  expect(navigate).toHaveBeenCalledWith(['/']);
});

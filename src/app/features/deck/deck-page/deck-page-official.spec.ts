import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import type { Deck } from '../../../core/api/deck.model';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { CardStatesData } from '../../../core/data/card-states-data';
import { CardsData } from '../../../core/data/cards-data';
import { DecksData } from '../../../core/data/decks-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { queryAll, rootText } from '../../../testing/dom-testing';
import { DeckPage } from './deck-page';

const OFFICIAL: Deck = {
  id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'official_subscription', originRef: null,
  originLabel: null, officialStatus: 'published', cardCount: 12, contentUpdatedAt: '2026-09-19T00:00:00Z',
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
};
function setup(deck: Deck, online = true): ReturnType<typeof TestBed.createComponent<DeckPage>> {
  TestBed.configureTestingModule({
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'd1']]) } } },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      { provide: DecksData, useValue: { watchById: () => () => deck } },
      { provide: CardsData, useValue: { byDeck: () => () => [] } },
      { provide: CardStatesData, useValue: { byCardId: () => new Map() } },
      { provide: SubjectsData, useValue: { active: () => [], all: () => [{ id: 's1', name: 'Direito', active: true, changeSeq: 1 }] } },
      { provide: ConnectivityStore, useValue: { online: () => online } },
    ],
  });
  const fixture = TestBed.createComponent(DeckPage);
  fixture.detectChanges();
  return fixture;
}
function labels(fixture: ReturnType<typeof setup>): string[] {
  return queryAll(fixture, 'main button, header button').map((button) => button.textContent?.trim() ?? '');
}

it('CA-07 — deck oficial não oferece Editar, Excluir nem Novo cartão', () => {
  const found = labels(setup(OFFICIAL));
  for (const hidden of ['Editar', 'Excluir', 'Novo cartão']) {
    expect(found).not.toContain(hidden);
  }
});

it('CA-07 — deck oficial oferece zerar progresso, duplicar e cancelar inscrição, com o selo Oficial', () => {
  const fixture = setup(OFFICIAL);
  expect(labels(fixture)).toEqual(expect.arrayContaining(['Zerar progresso', 'Duplicar como deck próprio', 'Cancelar inscrição']));
  expect(rootText(fixture)).toContain('Oficial');
});

it('CA-17 — deck descontinuado mostra o selo "Descontinuado" como texto', () => {
  expect(rootText(setup({ ...OFFICIAL, officialStatus: 'discontinued' }))).toContain('Descontinuado');
});

it('CA-09 — Cancelar inscrição abre a confirmação com a guarda de 90 dias', () => {
  const fixture = setup(OFFICIAL);
  queryAll(fixture, 'header button').find((button) => button.textContent?.trim() === 'Cancelar inscrição')?.click();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('guardado por 90 dias');
});

it('CA-04 — sem rede, duplicar e cancelar inscrição ficam indisponíveis com o motivo', () => {
  const fixture = setup(OFFICIAL, false);
  const headerButtons = queryAll(fixture, 'header button') as HTMLButtonElement[];
  const cancel = headerButtons.find((button) => button.textContent?.trim() === 'Cancelar inscrição');
  const duplicate = headerButtons.find((button) => button.textContent?.trim() === 'Duplicar como deck próprio');
  expect(cancel?.disabled).toBe(true);
  expect(duplicate?.disabled).toBe(true);
  expect(rootText(fixture)).toContain('Isso precisa de conexão');
});

it('CA-05 — deck próprio continua com as ações do PRD 1 e sem selo', () => {
  const fixture = setup({ ...OFFICIAL, origin: 'own', officialStatus: null });
  expect(labels(fixture)).toEqual(expect.arrayContaining(['Editar', 'Excluir', 'Novo cartão']));
  expect(labels(fixture)).not.toContain('Cancelar inscrição');
});

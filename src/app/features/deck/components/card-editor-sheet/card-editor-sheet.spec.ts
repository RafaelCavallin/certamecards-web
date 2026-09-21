import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { CardsApi } from '../../../../core/api/cards-api';
import { CardStatesData } from '../../../../core/data/card-states-data';
import { CardsData } from '../../../../core/data/cards-data';
import { ConnectivityStore } from '../../../../core/connectivity/connectivity-store';
import { toCardRow } from '../../../../core/db/card-row';
import { queryAll, queryElement, setInputValue, submitForm } from '../../../../testing/dom-testing';
import { CardEditorSheet } from './card-editor-sheet';

const CARD = toCardRow({
  id: 'c1',
  deckId: 'd1',
  type: 'basic',
  front: 'Q',
  back: 'R',
  source: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
  version: 2,
  changeSeq: 1,
});
function setup(options: { online?: boolean; cardId?: string | null } = {}): {
  fixture: ReturnType<typeof TestBed.createComponent<CardEditorSheet>>;
  cardsData: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  cardStatesData: { byCardId: () => Map<string, unknown>; setSuspension: ReturnType<typeof vi.fn> };
} {
  const cardsData = {
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const cardStatesData = { byCardId: () => new Map(), setSuspension: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({
    providers: [
      { provide: CardsData, useValue: cardsData },
      { provide: CardStatesData, useValue: cardStatesData },
      { provide: CardsApi, useValue: { history: vi.fn().mockResolvedValue({ reviewLogs: [], reviewVoids: [] }) } },
      { provide: ConnectivityStore, useValue: { online: () => options.online ?? true } },
    ],
  });
  const fixture = TestBed.createComponent(CardEditorSheet);
  fixture.componentRef.setInput('deckId', 'd1');
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('cardId', options.cardId ?? null);
  fixture.componentRef.setInput('cards', [CARD]);
  fixture.detectChanges();
  return { fixture, cardsData, cardStatesData };
}

it('TU — cria um novo cartão preenchendo frente e verso', async () => {
  const { fixture, cardsData } = setup({ cardId: null });
  setInputValue(fixture, '#card-front', 'Nova pergunta');
  setInputValue(fixture, '#card-back', 'Nova resposta');
  submitForm(fixture);
  await fixture.whenStable();
  expect(cardsData.create).toHaveBeenCalledWith(
    'd1',
    expect.objectContaining({ front: 'Nova pergunta', back: 'Nova resposta' }),
  );
});

it('TU — edita um cartão existente com a versão atual', async () => {
  const { fixture, cardsData } = setup({ cardId: 'c1' });
  setInputValue(fixture, '#card-front', 'Pergunta editada');
  submitForm(fixture);
  await fixture.whenStable();
  expect(cardsData.update).toHaveBeenCalledWith('c1', 2, expect.objectContaining({ front: 'Pergunta editada' }));
});

it('TI-27 — desabilita o formulário sem rede', () => {
  const { fixture } = setup({ cardId: 'c1', online: false });
  const button = queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement;
  expect(button.disabled).toBe(true);
});

it('TU — suspender aciona setSuspension com o oposto do estado atual', async () => {
  const { fixture, cardStatesData } = setup({ cardId: 'c1' });
  const suspendButton = queryAll(fixture, 'button').find((button) => button.textContent?.trim() === 'Suspender');
  suspendButton?.click();
  await fixture.whenStable();
  expect(cardStatesData.setSuspension).toHaveBeenCalledWith('c1', true);
});

it('TU — excluir pede confirmação e depois chama delete', async () => {
  const { fixture, cardsData } = setup({ cardId: 'c1' });
  const deleteButton = queryAll(fixture, 'button').find((button) => button.textContent?.trim() === 'Excluir');
  deleteButton?.click();
  fixture.detectChanges();
  const confirmButtons = queryAll(fixture, 'app-confirm-dialog button');
  confirmButtons[1]?.click();
  await fixture.whenStable();
  expect(cardsData.delete).toHaveBeenCalledWith('c1', 2);
});

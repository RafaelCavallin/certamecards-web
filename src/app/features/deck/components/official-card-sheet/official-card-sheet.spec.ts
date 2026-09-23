import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { CardStatesData } from '../../../../core/data/card-states-data';
import type { CardRow } from '../../../../core/db/local-db.model';
import { ConnectivityStore } from '../../../../core/connectivity/connectivity-store';
import { EventsService } from '../../../../core/events/events-service';
import { ErrorReportsApi } from '../../../../core/api/error-reports-api';
import { queryAll, rootText, waitFor } from '../../../../testing/dom-testing';
import { OfficialCardSheet } from './official-card-sheet';

const CARD: CardRow = {
  id: 'c1', deckId: 'd1', type: 'basic', front: 'Fundamentos da República', back: 'Soberania, cidadania…',
  source: 'CF/88, art. 1º', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null,
  version: 1, changeSeq: 1, searchText: 'x',
};
function setup(online = true, suspended = false): {
  fixture: ReturnType<typeof TestBed.createComponent<OfficialCardSheet>>;
  setSuspension: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
} {
  const setSuspension = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn().mockResolvedValue({ id: 'r1' });
  TestBed.configureTestingModule({
    providers: [
      { provide: CardStatesData, useValue: { byCardId: () => new Map([['c1', { suspended }]]), setSuspension } },
      { provide: ConnectivityStore, useValue: { online: () => online } },
      { provide: ErrorReportsApi, useValue: { create } },
      { provide: EventsService, useValue: { record: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(OfficialCardSheet);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('card', CARD);
  fixture.detectChanges();
  return { fixture, setSuspension, create };
}
function click(fixture: ReturnType<typeof setup>['fixture'], text: string): void {
  queryAll(fixture, 'button').find((button) => button.textContent?.trim() === text)?.click();
}

it('CA-07 — mostra o cartão só para leitura, sem formulário de edição nem exclusão', () => {
  const { fixture } = setup();
  expect(rootText(fixture)).toContain('Fundamentos da República');
  expect(rootText(fixture)).toContain('Fonte: CF/88, art. 1º');
  expect(queryAll(fixture, 'textarea, form')).toHaveLength(0);
  expect(rootText(fixture)).not.toContain('Excluir');
});

it('CA-07 — suspende e reativa o cartão oficial', async () => {
  const active = setup();
  click(active.fixture, 'Suspender');
  await active.fixture.whenStable();
  expect(active.setSuspension).toHaveBeenCalledWith('c1', true);
});

it('CA-07 — cartão suspenso mostra Reativar', () => {
  const { fixture } = setup(true, true);
  expect(rootText(fixture)).toContain('Reativar');
});

it('CA-22 — Apontar erro abre o formulário, envia e devolve o foco ao botão', async () => {
  const { fixture, create } = setup();
  const trigger = queryAll(fixture, 'button').find((button) => button.textContent?.trim() === 'Apontar erro');
  trigger?.focus();
  trigger?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return queryAll(fixture, 'form').length > 0;
  });
  queryAll(fixture, 'form')[0]?.dispatchEvent(new Event('submit'));
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Obrigado') === true;
  });
  expect(create).toHaveBeenCalledWith('c1', { reason: 'outdated_content', note: null });
  expect(rootText(fixture)).toContain('Obrigado');
  queryAll(fixture, 'button').find((button) => button.textContent?.trim() === 'Fechar')?.click();
  expect(document.activeElement).toBe(trigger);
});

it('CA-04 — sem rede, suspender e apontar erro ficam indisponíveis com o motivo', () => {
  const { fixture } = setup(false);
  const buttons = queryAll(fixture, 'button') as HTMLButtonElement[];
  expect(buttons.find((button) => button.textContent?.trim() === 'Suspender')?.disabled).toBe(true);
  expect(buttons.find((button) => button.textContent?.trim() === 'Apontar erro')?.disabled).toBe(true);
  expect(rootText(fixture)).toContain('Isso precisa de conexão.');
});

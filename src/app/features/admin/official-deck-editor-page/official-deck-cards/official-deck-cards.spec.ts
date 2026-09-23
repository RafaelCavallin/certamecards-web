import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { OfficialDecksApi } from '../../../../core/api/official-decks-api';
import { queryAll, rootText, waitFor } from '../../../../testing/dom-testing';
import { aPageOf, anOfficialCard } from '../../official-test-support';
import { OfficialDeckCards } from './official-deck-cards';

function setup(listCards: ReturnType<typeof vi.fn>, openCardId: string | null = null): ReturnType<typeof TestBed.createComponent<OfficialDeckCards>> {
  TestBed.configureTestingModule({ providers: [{ provide: OfficialDecksApi, useValue: { listCards } }] });
  const fixture = TestBed.createComponent(OfficialDeckCards);
  fixture.componentRef.setInput('deckId', 'd1');
  fixture.componentRef.setInput('status', 'draft');
  fixture.componentRef.setInput('openCardId', openCardId);
  fixture.detectChanges();
  return fixture;
}
async function settled(fixture: ReturnType<typeof setup>): Promise<void> {
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Carregando') === false;
  });
}

it('CA-11 — lista os cartões do deck com frente, fonte e verso', async () => {
  const fixture = setup(vi.fn().mockResolvedValue(aPageOf([anOfficialCard()])));
  await settled(fixture);
  expect(rootText(fixture)).toContain('Fundamentos da República');
  expect(rootText(fixture)).toContain('CF/88, art. 1º · Soberania…');
});

it('CA-11 — deck sem cartões mostra o vazio', async () => {
  const fixture = setup(vi.fn().mockResolvedValue(aPageOf([])));
  await settled(fixture);
  expect(rootText(fixture)).toContain('Este deck ainda não tem cartões');
});

it('CA-11 — erro mostra alerta e permite tentar de novo', async () => {
  const fixture = setup(vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(aPageOf([anOfficialCard()])));
  await settled(fixture);
  expect(rootText(fixture)).toContain('Não foi possível carregar os cartões');
  queryAll(fixture, 'button').find((button) => button.textContent === 'Tentar de novo')?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Fundamentos') === true;
  });
});

it('CA-11 — paginação pede a página seguinte', async () => {
  const listCards = vi.fn().mockResolvedValue(aPageOf([anOfficialCard()], { total: 45 }));
  const fixture = setup(listCards);
  await settled(fixture);
  queryAll(fixture, 'button').find((button) => button.textContent === 'Próxima')?.click();
  await waitFor(() => listCards.mock.calls.length >= 2);
  expect(listCards).toHaveBeenLastCalledWith('d1', 1);
});

it('CA-23 — ?card= abre o editor no cartão, mesmo em outra página', async () => {
  const target = anOfficialCard({ id: 'c9', front: 'Cartão do apontamento' });
  const listCards = vi.fn()
    .mockResolvedValueOnce(aPageOf([anOfficialCard()], { total: 40 }))
    .mockResolvedValueOnce(aPageOf([anOfficialCard()], { total: 40 }))
    .mockResolvedValueOnce(aPageOf([target], { total: 40, page: 1 }));
  const fixture = setup(listCards, 'c9');
  await waitFor(() => {
    fixture.detectChanges();
    return (queryAll(fixture, '#card-front')[0] as HTMLTextAreaElement | undefined)?.value === 'Cartão do apontamento';
  });
});

it('CA-11 — cartão de abertura inexistente não abre o editor', async () => {
  const listCards = vi.fn().mockResolvedValue(aPageOf([anOfficialCard()]));
  const fixture = setup(listCards, 'inexistente');
  await settled(fixture);
  await waitFor(() => listCards.mock.calls.length >= 2);
  expect(queryAll(fixture, '#card-front')).toHaveLength(0);
});

import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import type { CardErrorReport } from '../../../core/api/error-report.model';
import { ErrorReportsApi } from '../../../core/api/error-reports-api';
import { queryAll, rootText, waitFor } from '../../../testing/dom-testing';
import { aPageOf, routingMocks, spyNavigate } from '../official-test-support';
import { ErrorReportsPage } from './error-reports-page';

function aReport(overrides: Partial<CardErrorReport> = {}): CardErrorReport {
  return {
    id: 'r1', cardId: 'c1', deckId: 'd1', deckName: 'CF/88', subjectName: 'Direito Constitucional',
    cardFront: 'Fundamentos da República', reporterName: 'Ana', reason: 'outdated_content',
    note: 'A EC mudou o inciso.', status: 'open', createdAt: '2026-09-19T15:20:00Z', closedAt: null, closedBy: null,
    ...overrides,
  };
}
async function setup(api: Record<string, ReturnType<typeof vi.fn>>): Promise<ReturnType<typeof TestBed.createComponent<ErrorReportsPage>>> {
  TestBed.configureTestingModule({
    providers: [...(routingMocks().providers as Provider[]), { provide: ErrorReportsApi, useValue: api }],
  });
  const fixture = TestBed.createComponent(ErrorReportsPage);
  fixture.detectChanges();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Carregando') === false;
  });
  return fixture;
}
function click(fixture: ReturnType<typeof TestBed.createComponent<ErrorReportsPage>>, text: string): void {
  queryAll(fixture, 'button').find((button) => button.textContent?.trim() === text)?.click();
}

it('CA-23 — mostra matéria, deck, cartão, motivo, texto e o nome de quem apontou, sem e-mail', async () => {
  const fixture = await setup({ list: vi.fn().mockResolvedValue(aPageOf([aReport()])) });
  const text = rootText(fixture) ?? '';
  for (const expected of ['Direito Constitucional', 'CF/88', 'Fundamentos da República', 'Conteúdo desatualizado', 'A EC mudou o inciso.', 'Ana']) {
    expect(text).toContain(expected);
  }
  expect(text).not.toContain('@');
});

it('CA-23 — a lista abre pedindo os abertos e o filtro troca a situação', async () => {
  const list = vi.fn().mockResolvedValue(aPageOf([]));
  const fixture = await setup({ list });
  expect(list).toHaveBeenCalledWith({ status: 'open', page: 0 });
  expect(rootText(fixture)).toContain('Nenhum apontamento nesta situação');
  const select = queryAll(fixture, '#report-status')[0] as HTMLSelectElement;
  select.value = 'resolved';
  select.dispatchEvent(new Event('change'));
  await waitFor(() => list.mock.calls.length >= 2);
  expect(list).toHaveBeenLastCalledWith({ status: 'resolved', page: 0 });
});

it('CA-23 — "Abrir cartão" leva ao editor do deck com o cartão', async () => {
  const fixture = await setup({ list: vi.fn().mockResolvedValue(aPageOf([aReport()])) });
  const navigate = spyNavigate();
  click(fixture, 'Abrir cartão');
  expect(navigate).toHaveBeenCalledWith(['/admin/decks-oficiais', 'd1'], { queryParams: { card: 'c1' } });
});

it('CA-23 — encerrar como resolvido ou improcedente chama a API e recarrega a lista', async () => {
  const close = vi.fn().mockResolvedValue(aReport({ status: 'resolved' }));
  const list = vi.fn().mockResolvedValueOnce(aPageOf([aReport()])).mockResolvedValue(aPageOf([]));
  const fixture = await setup({ list, close });
  click(fixture, 'Resolvido');
  await waitFor(() => list.mock.calls.length >= 2);
  expect(close).toHaveBeenCalledWith('r1', 'resolved');
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Nenhum apontamento nesta situação');
});

it('CA-23 — improcedente usa o desfecho rejected e a falha mostra a mensagem', async () => {
  const close = vi.fn().mockRejectedValue(new Error('x'));
  const fixture = await setup({ list: vi.fn().mockResolvedValue(aPageOf([aReport()])), close });
  click(fixture, 'Improcedente');
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Não foi possível concluir a ação') === true;
  });
  expect(close).toHaveBeenCalledWith('r1', 'rejected');
});

it('CA-23 — apontamento já encerrado não oferece encerrar de novo', async () => {
  const fixture = await setup({ list: vi.fn().mockResolvedValue(aPageOf([aReport({ status: 'resolved' })])) });
  expect(queryAll(fixture, 'button').map((button) => button.textContent?.trim())).not.toContain('Resolvido');
});

it('CA-23 — erro ao carregar mostra alerta', async () => {
  const failing = await setup({ list: vi.fn().mockRejectedValue(new Error('x')) });
  expect(rootText(failing)).toContain('Não foi possível carregar os apontamentos');
});

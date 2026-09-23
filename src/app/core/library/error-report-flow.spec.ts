import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { ErrorReportsApi } from '../api/error-reports-api';
import { toCardRow } from '../db/card-row';
import { LocalDb } from '../db/local-db';
import { EventsService } from '../events/events-service';
import { ErrorReportFlow } from './error-report-flow';

let db: LocalDb;
const record = vi.fn();

function setup(create: ReturnType<typeof vi.fn>): ErrorReportFlow {
  TestBed.configureTestingModule({
    providers: [ErrorReportFlow, { provide: ErrorReportsApi, useValue: { create } }, { provide: EventsService, useValue: { record } }],
  });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(ErrorReportFlow);
}
const REQUEST = { reason: 'typo', note: null } as const;

afterEach(async () => {
  await db.delete();
});

it('TI-57 — abrir sem apontamento anterior mostra o formulário', async () => {
  const flow = setup(vi.fn());
  await flow.open('c1');
  expect(flow.phase()).toBe('form');
});

it('TI-57 — enviar grava o apontamento local e mostra a confirmação', async () => {
  const create = vi.fn().mockResolvedValue({ id: 'r1' });
  const flow = setup(create);
  await flow.open('c1');
  await flow.submit(REQUEST);
  expect(create).toHaveBeenCalledWith('c1', REQUEST);
  expect(flow.phase()).toBe('sent');
  expect(await db.errorReports.get('c1')).toBeDefined();
});

it('TI-57 — cartão já apontado neste aparelho mostra o aviso sem chamar a API', async () => {
  const create = vi.fn();
  const flow = setup(create);
  await db.errorReports.put({ cardId: 'c1', reportedAt: '2026-09-19T00:00:00Z' });
  await flow.open('c1');
  expect(flow.phase()).toBe('already');
  expect(create).not.toHaveBeenCalled();
});

it('TI-57 — 409 report_already_sent vira "já apontado" e é lembrado localmente', async () => {
  const conflict = new HttpErrorResponse({ status: 409, error: { status: 409, code: 'report_already_sent', detail: 'x' } });
  const flow = setup(vi.fn().mockRejectedValue(conflict));
  await flow.open('c1');
  await flow.submit(REQUEST);
  expect(flow.phase()).toBe('already');
  expect(await db.errorReports.get('c1')).toBeDefined();
});

it('TI-57 — outra falha volta ao formulário com a mensagem e não grava nada local', async () => {
  const flow = setup(vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 0 })));
  await flow.open('c1');
  await flow.submit(REQUEST);
  expect(flow.phase()).toBe('form');
  expect(flow.errorMessage()).toBe('Isso precisa de conexão.');
  expect(await db.errorReports.count()).toBe(0);
});

it('TU — close volta a closed e limpa a mensagem; submit sem open não faz nada', async () => {
  const create = vi.fn();
  const flow = setup(create);
  await flow.submit(REQUEST);
  expect(create).not.toHaveBeenCalled();
  await flow.open('c1');
  flow.close();
  expect(flow.phase()).toBe('closed');
  expect(flow.errorMessage()).toBeNull();
});

it('deck registra card_error_reported com deckId e motivo, sem o texto do apontamento', async () => {
  const flow = setup(vi.fn().mockResolvedValue({ id: 'r1' }));
  await db.cards.put(
    toCardRow({
      id: 'c1', deckId: 'd1', type: 'basic', front: 'F', back: 'B', source: null,
      createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
    }),
  );
  await flow.open('c1');
  await flow.submit({ reason: 'typo', note: 'texto livre' });
  expect(record).toHaveBeenCalledWith('card_error_reported', { deckId: 'd1', reason: 'typo' });
});

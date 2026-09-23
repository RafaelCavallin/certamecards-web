import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AuditLogApi } from './audit-log-api';
import { ErrorReportsApi } from './error-reports-api';

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

function setup(): HttpTestingController {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.inject(HttpTestingController);
}

it('TU — create envia o apontamento para o cartão', async () => {
  const httpMock = setup();
  const promise = TestBed.inject(ErrorReportsApi).create('c1', { reason: 'typo', note: null });
  const req = httpMock.expectOne('/api/cards/c1/error-reports');
  expect(req.request.body).toEqual({ reason: 'typo', note: null });
  req.flush({ id: 'r1', status: 'open' });
  await expect(promise).resolves.toMatchObject({ id: 'r1' });
});

it('TU — list e close usam as rotas administrativas', async () => {
  const httpMock = setup();
  const api = TestBed.inject(ErrorReportsApi);
  const list = api.list({ status: 'open', page: 0 });
  const listReq = httpMock.expectOne((r) => r.url === '/api/admin/error-reports');
  expect(listReq.request.params.get('status')).toBe('open');
  listReq.flush({ items: [], page: 0, size: 20, total: 0 });
  await list;
  const close = api.close('r1', 'resolved');
  const closeReq = httpMock.expectOne('/api/admin/error-reports/r1/closure');
  expect(closeReq.request.body).toEqual({ outcome: 'resolved' });
  closeReq.flush({ id: 'r1', status: 'resolved' });
  await close;
});

it('TU — audit log envia só os filtros preenchidos', async () => {
  const httpMock = setup();
  const promise = TestBed.inject(AuditLogApi).list({
    actorId: null, action: 'official_deck_created', from: null, to: null, before: 'cursor',
  });
  const req = httpMock.expectOne((r) => r.url === '/api/admin/audit-logs');
  expect(req.request.params.get('action')).toBe('official_deck_created');
  expect(req.request.params.get('before')).toBe('cursor');
  expect(req.request.params.has('actorId')).toBe(false);
  req.flush({ items: [], nextBefore: null });
  await expect(promise).resolves.toEqual({ items: [], nextBefore: null });
});

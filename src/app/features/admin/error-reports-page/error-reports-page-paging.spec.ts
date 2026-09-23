import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { ErrorReportsApi } from '../../../core/api/error-reports-api';
import { queryAll, rootText, waitFor } from '../../../testing/dom-testing';
import { aPageOf, routingMocks } from '../official-test-support';
import { ErrorReportsPage } from './error-reports-page';

it('CA-23 — paginação pede a página seguinte', async () => {
  const list = vi.fn().mockResolvedValue(aPageOf([], { total: 45 }));
  TestBed.configureTestingModule({
    providers: [...(routingMocks().providers as Provider[]), { provide: ErrorReportsApi, useValue: { list } }],
  });
  const fixture = TestBed.createComponent(ErrorReportsPage);
  fixture.detectChanges();
  await waitFor(() => list.mock.calls.length > 0);
  fixture.detectChanges();
  queryAll(fixture, 'button').find((button) => button.textContent === 'Próxima')?.click();
  await waitFor(() => list.mock.calls.length >= 2);
  expect(list).toHaveBeenLastCalledWith({ status: 'open', page: 1 });
});

it('CA-04 — sem rede não consulta e mostra o motivo', () => {
  const mocks = routingMocks();
  mocks.online.set(false);
  const list = vi.fn();
  TestBed.configureTestingModule({
    providers: [...(mocks.providers as Provider[]), { provide: ErrorReportsApi, useValue: { list } }],
  });
  const fixture = TestBed.createComponent(ErrorReportsPage);
  fixture.detectChanges();
  expect(list).not.toHaveBeenCalled();
  expect(rootText(fixture)).toContain('Isso precisa de conexão');
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store';
import { SubjectsData } from '../../../core/data/subjects-data';
import { toCardRow } from '../../../core/db/card-row';
import { LocalDb } from '../../../core/db/local-db';
import { clickElement, queryAll, queryElement, rootText, waitFor } from '../../../testing/dom-testing';
import { aCard, aDeck, aState } from './study-page-test-support';
import { StudyPage } from './study-page';

let db: LocalDb;

async function setup(note: string | null): Promise<ReturnType<typeof TestBed.createComponent<StudyPage>>> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthStore, useValue: { user: () => null } },
      { provide: SubjectsData, useValue: { all: () => [{ id: 's1', name: 'Direito', active: true, changeSeq: 1 }] } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
    ],
  });
  db = TestBed.inject(LocalDb);
  await db.decks.add({ ...aDeck(), origin: 'official_subscription', officialStatus: 'published' });
  await db.cards.bulkAdd([toCardRow(aCard('c1')), toCardRow(aCard('c2'))]);
  const contentUpdatedAt = note === null ? null : '2026-09-17T00:00:00Z';
  await db.cardStates.bulkAdd([
    { ...aState('c1'), contentUpdateNote: note, contentUpdatedAt },
    { ...aState('c2'), due: '2026-09-19T08:00:00Z' },
  ]);
  const fixture = TestBed.createComponent(StudyPage);
  fixture.detectChanges();
  await waitFor(() => rootText(fixture)?.includes('Pergunta') === true);
  return fixture;
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-18T09:00:00Z'));
});
afterEach(async () => {
  vi.useRealTimers();
  await db.delete();
});

it('TI-55 — o cartão com nota mostra o aviso antes da revelação e ele some ao avaliar', async () => {
  const fixture = await setup('Lei 14.xxx/2026 alterou o prazo.');
  expect(rootText(fixture)).toContain('Atualizado em 17/09/2026: Lei 14.xxx/2026 alterou o prazo.');
  expect(rootText(fixture)).not.toContain('Resposta c1');
  clickElement(fixture, '#s-reveal');
  fixture.detectChanges();
  await waitFor(() => queryElement(fixture, '#s-rate-3') !== null);
  clickElement(fixture, '#s-rate-3');
  await waitFor(() => rootText(fixture)?.includes('Atualizado em') === false);
  expect(await db.outbox.count()).toBe(1);
  expect((await db.cardStates.get('c1'))?.contentUpdateNote).toBeNull();
});

it('TI-55 — cartão sem nota não mostra aviso', async () => {
  const fixture = await setup(null);
  expect(rootText(fixture)).not.toContain('Atualizado em');
});

it('TI-57 — apontar erro não altera o cartão, a fila nem o histórico e devolve o foco', async () => {
  const fixture = await setup(null);
  const httpMock = TestBed.inject(HttpTestingController);
  const trigger = queryAll(fixture, 'app-study-error-report button')[0];
  trigger?.focus();
  trigger?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return queryElement(fixture, 'app-error-report-form form') !== null;
  });
  queryElement(fixture, 'app-error-report-form form')?.dispatchEvent(new Event('submit'));
  await waitFor(() => httpMock.match('/api/cards/c1/error-reports').map((req) => req.flush({ id: 'r1' })).length > 0);
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Obrigado') === true;
  });
  queryAll(fixture, 'app-error-report-form button').find((button) => button.textContent === 'Fechar')?.click();
  expect(document.activeElement).toBe(trigger);
  expect(rootText(fixture)).toContain('Pergunta c1');
  expect(await db.reviewLogs.count()).toBe(0);
  expect(await db.outbox.count()).toBe(0);
});

it('TI-57 — o segundo apontamento no mesmo cartão mostra "Você já apontou um erro neste cartão"', async () => {
  const fixture = await setup(null);
  await db.errorReports.put({ cardId: 'c1', reportedAt: '2026-09-18T08:00:00Z' });
  queryAll(fixture, 'app-study-error-report button')[0]?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Você já apontou um erro neste cartão') === true;
  });
  expect(queryElement(fixture, 'app-error-report-form form')).toBeNull();
});

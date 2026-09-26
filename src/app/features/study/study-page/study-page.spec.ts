import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AccountDb } from '../../../core/db/account-db';
import { StudySessionStore } from '../../../core/study/study-session-store';
import { clickElement, exists, queryElement, rootText, waitFor } from '../../../testing/dom-testing';
import { setupStudyPage } from './study-page-test-support';

let db: AccountDb;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-18T09:00:00Z'));
});

afterEach(async () => {
  vi.useRealTimers();
  await TestBed.inject(StudySessionStore).flushPendingWrites();
  TestBed.resetTestingModule();
  await db.delete();
});

it('E2E-03 — mostra a pergunta e revela a resposta com Espaço', async () => {
  const { db: newDb, fixture } = await setupStudyPage(true);
  db = newDb;
  await waitFor(() => rootText(fixture)?.includes('Pergunta') === true);
  expect(rootText(fixture)).toContain('Direito');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true }));
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Resposta');
});

it('E2E-03 — avalia com a tecla 3 e avança para o próximo cartão', async () => {
  const { db: newDb, fixture } = await setupStudyPage(true);
  db = newDb;
  await waitFor(() => rootText(fixture)?.includes('Pergunta') === true);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true }));
  fixture.detectChanges();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', cancelable: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  await TestBed.inject(StudySessionStore).flushPendingWrites();
  expect(await db.reviewLogs.count()).toBe(1);
});

it('TU — avalia clicando na barra de notas', async () => {
  const { db: newDb, fixture } = await setupStudyPage(true);
  db = newDb;
  await waitFor(() => rootText(fixture)?.includes('Pergunta') === true);
  clickElement(fixture, '#s-reveal');
  fixture.detectChanges();
  await waitFor(() => queryElement(fixture, '#s-rate-3') !== null);
  clickElement(fixture, '#s-rate-3');
  await fixture.whenStable();
  expect(await db.reviewLogs.count()).toBe(1);
});

it('TU — mostra a tela de tudo em dia quando não há cartões', async () => {
  const { db: newDb, fixture } = await setupStudyPage(false);
  db = newDb;
  await waitFor(() => rootText(fixture)?.includes('Tudo em dia') === true);
  expect(rootText(fixture)).toContain('Tudo em dia');
});

it('TU-83 — não renderiza o indicador de sincronização durante a sessão', async () => {
  const { db: newDb, fixture } = await setupStudyPage(true);
  db = newDb;
  await waitFor(() => rootText(fixture)?.includes('Pergunta') === true);
  expect(exists(fixture, 'app-sync-indicator')).toBe(false);
});

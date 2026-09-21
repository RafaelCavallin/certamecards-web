import { convertToParamMap, type ActivatedRoute } from '@angular/router';
import { expect, it, vi } from 'vitest';
import type { SettingsData } from '../../core/data/settings-data';
import type { StudySessionStore } from '../../core/study/study-session-store';
import { buildSummaryView, runStart } from './study-page-session';

function aRoute(params: Record<string, string>): ActivatedRoute {
  return { snapshot: { queryParamMap: convertToParamMap(params) } } as unknown as ActivatedRoute;
}

function settingsWith(focusMinutes?: number): SettingsData {
  return { current: () => (focusMinutes === undefined ? undefined : { focusMinutes }) } as unknown as SettingsData;
}

it('TU — runStart devolve unavailable quando a sessão não começa', async () => {
  const start = vi.fn().mockResolvedValue({ started: false, nextAvailableAt: new Date('2026-09-18T09:20:00Z') });
  const store = { start } as unknown as StudySessionStore;
  const outcome = await runStart(store, settingsWith(), aRoute({}));
  expect(outcome.phase).toBe('unavailable');
  expect(outcome.nextAvailableAt).toEqual(new Date('2026-09-18T09:20:00Z'));
  expect(start).toHaveBeenCalledWith({ kind: 'all' }, 25);
});

it('TU — runStart usa o foco configurado e o escopo do deck', async () => {
  const start = vi.fn().mockResolvedValue({ started: true, nextAvailableAt: null });
  const store = { start } as unknown as StudySessionStore;
  const outcome = await runStart(store, settingsWith(45), aRoute({ deck: 'd1' }));
  expect(outcome.phase).toBe('session');
  expect(start).toHaveBeenCalledWith({ kind: 'deck', deckId: 'd1' }, 45);
});

it('TU — buildSummaryView combina o resumo com os textos', () => {
  const end = vi.fn().mockReturnValue({ reviewed: 5, correct: 4, focusMinutes: 10, uniqueCards: 5, cardsLeftNow: 0, blockDone: false });
  const store = { end } as unknown as StudySessionStore;
  const view = buildSummaryView(store);
  expect(view.title).toBe('Tudo revisado por hoje');
  expect(view.reviewed).toBe(5);
});

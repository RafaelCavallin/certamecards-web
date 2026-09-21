import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryAll } from '../../../testing/dom-testing';
import { aDeck, setupDashboard } from './dashboard-page-test-support';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-17T08:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

it('TU — Começar sessão navega para /estudar com a matéria selecionada', () => {
  const subjects = [
    { id: 's1', name: 'Direito', active: true, changeSeq: 1 },
    { id: 's2', name: 'Português', active: true, changeSeq: 1 },
  ];
  const decks = [aDeck(), aDeck({ id: 'd2', subjectId: 's2', name: 'Crase' })];
  const { fixture, navigate } = setupDashboard({ decks, subjects, cards: [{ id: 'c1', deckId: 'd1' }, { id: 'c2', deckId: 'd2' }] });
  const subjectButton = queryAll(fixture, 'button').find((button) => button.textContent?.trim() === 'Direito');
  subjectButton?.click();
  fixture.detectChanges();
  const startButton = queryAll(fixture, 'button').find((button) => button.textContent?.includes('Começar sessão'));
  startButton?.click();
  expect(navigate).toHaveBeenCalledWith(['/estudar'], { queryParams: { subject: 's1' } });
});

it('TU — Estudar no deck navega para /estudar com o deck', () => {
  const { fixture, navigate } = setupDashboard({ decks: [aDeck()], cards: [{ id: 'c1', deckId: 'd1' }] });
  const studyButton = queryAll(fixture, 'button').find((button) => button.textContent?.trim() === 'Estudar');
  studyButton?.click();
  expect(navigate).toHaveBeenCalledWith(['/estudar'], { queryParams: { deck: 'd1' } });
});

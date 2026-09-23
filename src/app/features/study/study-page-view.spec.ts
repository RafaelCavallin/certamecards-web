import { expect, it } from 'vitest';
import type { CardState } from '../../core/api/card-state.model';
import { focusTimerMode, intervalLabels } from './study-page-view';

function aState(): CardState {
  return {
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-18T00:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1,
  };
}

it('TU — intervalLabels devolve rótulos vazios sem prévias', () => {
  expect(intervalLabels(null)).toEqual({ 1: '', 2: '', 3: '', 4: '' });
});

it('TU — intervalLabels extrai o rótulo de cada nota', () => {
  const previews = {
    1: { state: aState(), intervalLabel: '1 min' },
    2: { state: aState(), intervalLabel: '6 min' },
    3: { state: aState(), intervalLabel: '10 min' },
    4: { state: aState(), intervalLabel: '4 d' },
  };
  expect(intervalLabels(previews)).toEqual({ 1: '1 min', 2: '6 min', 3: '10 min', 4: '4 d' });
});

it('TU — focusTimerMode é done quando não sobra tempo', () => {
  expect(focusTimerMode(0, false)).toBe('done');
});

it('TU — focusTimerMode é pause quando pausado com tempo restante', () => {
  expect(focusTimerMode(60, true)).toBe('pause');
});

it('TU — focusTimerMode é focus quando em andamento', () => {
  expect(focusTimerMode(60, false)).toBe('focus');
});

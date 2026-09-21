import { createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import { toFsrsCard, fromFsrsCard } from './card-state-conversion';
import { FSRS_PARAMETERS } from './scheduler-service';
import type { Rating } from './scheduler.model';
import fsrs6Vectors from './fixtures/fsrs6-vectors.json';

interface Fsrs6Vector {
  readonly scenario: string;
  readonly steps: readonly { readonly rating: Rating; readonly reviewedAt: string }[];
  readonly expected: { readonly state: number; readonly stability: number; readonly difficulty: number; readonly scheduledDays: number };
}

// ts-fsrs aplica o fuzz também a scheduled_days (não só a due); os vetores do py-fsrs
// são gerados sem fuzz, então a comparação usa aqui um motor com enable_fuzz desligado.
const unfuzzedEngine = fsrs(generatorParameters({ ...FSRS_PARAMETERS, enable_fuzz: false }));

function applyUnfuzzed(state: CardState | null, rating: Rating, now: Date): CardState {
  const input = state !== null ? toFsrsCard(state) : createEmptyCard(now);
  const { card } = unfuzzedEngine.next(input, now, rating);
  return fromFsrsCard(card, { cardId: state?.cardId ?? '', reviewCount: (state?.reviewCount ?? 0) + 1, previous: state });
}

describe('TU-01 — scheduler reproduz os vetores FSRS-6', () => {
  const vectors = fsrs6Vectors as readonly Fsrs6Vector[];

  it('vetores gerados por scripts/gen-fsrs6-vectors.py', () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors.map((vector) => [vector.scenario, vector] as const))('%s', (_scenario, vector) => {
    let state: CardState | null = null;
    for (const step of vector.steps) {
      const now = new Date(step.reviewedAt);
      state = applyUnfuzzed(state, step.rating, now);
    }
    expect(state?.state).toBe(vector.expected.state);
    expect(state?.stability).toBeCloseTo(vector.expected.stability, 3);
    expect(state?.difficulty).toBeCloseTo(vector.expected.difficulty, 3);
    expect(state?.scheduledDays).toBe(vector.expected.scheduledDays);
  });
});

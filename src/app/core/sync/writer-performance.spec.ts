import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { DeckMutationWriter } from './deck-mutation-writer';
import { CardMutationWriter } from './card-mutation-writer';

const SAMPLE_COUNT = 30;
const P95_BUDGET_PER_WRITE_MS = 100;
const WRITES_PER_SAMPLE = 2;

function percentile95(durations: readonly number[]): number {
  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

afterEach(async () => {
  await TestBed.inject(CurrentAccountDb).current()?.db.delete();
});

it('TI-80 — writers comuns mantêm p95 local em até 100 ms', async () => {
  TestBed.configureTestingModule({});
  const db = new AccountDb('writer-performance-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'writer-performance-test' });
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  const deckWriter = TestBed.inject(DeckMutationWriter);
  const cardWriter = TestBed.inject(CardMutationWriter);
  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const deckId = `d-${index}`;
    const start = performance.now();
    await deckWriter.execute({ kind: 'deck_create', deckId, subjectId: 's1', name: `Deck ${index}`, description: null });
    await cardWriter.execute({ kind: 'card_create', deckId, cardId: `c-${index}`, type: 'basic', front: 'Q', back: 'R', source: null });
    durations.push(performance.now() - start);
  }
  expect(percentile95(durations)).toBeLessThan(P95_BUDGET_PER_WRITE_MS * WRITES_PER_SAMPLE);
});

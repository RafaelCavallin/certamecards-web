import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import type { LibraryDeckSummary } from '../../../core/api/library.model';
import { EventsService } from '../../../core/events/events-service';
import { SuggestionsService } from '../../../core/library/suggestions-service';
import { queryAll, rootText } from '../../../testing/dom-testing';
import { DashboardEmpty } from './dashboard-empty';

function aSuggestion(id: string, subjectName: string): LibraryDeckSummary {
  return {
    id, subjectId: subjectName, subjectName, name: `Deck ${id}`, description: null, cardCount: 12,
    contentUpdatedAt: '2026-09-19T00:00:00Z', subscribed: false,
  };
}
const record = vi.fn();
async function setup(suggestions: readonly LibraryDeckSummary[]): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<DashboardEmpty>>;
  navigate: ReturnType<typeof vi.fn>;
}> {
  const navigate = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: { navigate } },
      { provide: EventsService, useValue: { record } },
      { provide: SuggestionsService, useValue: { load: () => Promise.resolve(suggestions) } },
    ],
  });
  const fixture = TestBed.createComponent(DashboardEmpty);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, navigate };
}

it('TU-42 — mostra "Novo deck" e as sugestões de matérias diferentes', async () => {
  const { fixture } = await setup([aSuggestion('a', 'Direito'), aSuggestion('b', 'Português'), aSuggestion('c', 'Informática')]);
  const text = rootText(fixture) ?? '';
  expect(text).toContain('Novo deck');
  expect(text).toContain('Comece por um deck oficial');
  expect(queryAll(fixture, 'section[aria-labelledby] > div.flex.flex-wrap')).toHaveLength(3);
});

it('TU-42 — sem sugestões (offline ou vazio) mostra só "Novo deck"', async () => {
  const { fixture, navigate } = await setup([]);
  expect(rootText(fixture)).not.toContain('Comece por um deck oficial');
  queryAll(fixture, 'button').find((button) => button.textContent === 'Novo deck')?.click();
  expect(navigate).toHaveBeenCalledWith(['/decks', 'novo']);
});

it('TU-42 — a prévia da sugestão abre a biblioteca no deck escolhido e "Ver biblioteca" abre a lista', async () => {
  const { fixture, navigate } = await setup([aSuggestion('a', 'Direito')]);
  queryAll(fixture, 'button').find((button) => button.textContent === 'Ver prévia')?.click();
  expect(navigate).toHaveBeenCalledWith(['/biblioteca'], { queryParams: { deck: 'a' } });
  queryAll(fixture, 'button').find((button) => button.textContent === 'Ver biblioteca')?.click();
  expect(navigate).toHaveBeenCalledWith(['/biblioteca']);
  expect(record).toHaveBeenCalledWith('library_opened', { source: 'empty_state' });
});

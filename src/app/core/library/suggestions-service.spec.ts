import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { LibraryApi } from '../api/library-api';
import type { LibraryDeckSummary } from '../api/library.model';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { pickSuggestions, SuggestionsService } from './suggestions-service';

function aSummary(id: string, subjectId: string, subscribed = false): LibraryDeckSummary {
  return {
    id, subjectId, subjectName: subjectId, name: id, description: null, cardCount: 10,
    contentUpdatedAt: '2026-09-19T00:00:00Z', subscribed,
  };
}
function setup(online: boolean, suggestions: ReturnType<typeof vi.fn>): SuggestionsService {
  TestBed.configureTestingModule({
    providers: [
      { provide: LibraryApi, useValue: { suggestions } },
      { provide: ConnectivityStore, useValue: { online: () => online } },
    ],
  });
  return TestBed.inject(SuggestionsService);
}

it('TU-42 — pickSuggestions devolve até 3 decks, um por matéria', () => {
  const picked = pickSuggestions([
    aSummary('a', 's1'), aSummary('b', 's1'), aSummary('c', 's2'), aSummary('d', 's3'), aSummary('e', 's4'),
  ]);
  expect(picked.map((deck) => deck.id)).toEqual(['a', 'c', 'd']);
});

it('TU-42 — pickSuggestions ignora decks já inscritos', () => {
  expect(pickSuggestions([aSummary('a', 's1', true), aSummary('b', 's2')]).map((deck) => deck.id)).toEqual(['b']);
});

it('TU-42 — online, carrega as sugestões do servidor', async () => {
  const suggestions = vi.fn().mockResolvedValue([aSummary('a', 's1')]);
  const result = await setup(true, suggestions).load();
  expect(result.map((deck) => deck.id)).toEqual(['a']);
  expect(suggestions).toHaveBeenCalledWith(3);
});

it('TU-42 — sem rede devolve lista vazia sem chamar a API', async () => {
  const suggestions = vi.fn();
  expect(await setup(false, suggestions).load()).toEqual([]);
  expect(suggestions).not.toHaveBeenCalled();
});

it('TU-42 — falha da API devolve lista vazia', async () => {
  const suggestions = vi.fn().mockRejectedValue(new Error('x'));
  expect(await setup(true, suggestions).load()).toEqual([]);
});

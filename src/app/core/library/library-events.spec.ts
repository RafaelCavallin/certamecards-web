import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { EventsService } from '../events/events-service';
import { LibraryEvents } from './library-events';

function setup(): { events: LibraryEvents; record: ReturnType<typeof vi.fn> } {
  const record = vi.fn();
  TestBed.configureTestingModule({ providers: [{ provide: EventsService, useValue: { record } }] });
  return { events: TestBed.inject(LibraryEvents), record };
}

it('TU — busca com termo registra library_searched sem o texto digitado', () => {
  const { events, record } = setup();
  events.searched({ term: ' crase ', subjectId: null, resultCount: 2 });
  expect(record).toHaveBeenCalledWith('library_searched', { hasQuery: true, hasSubject: false, resultCount: 2 });
});

it('TU — filtro por matéria registra library_searched com hasSubject', () => {
  const { events, record } = setup();
  events.searched({ term: '', subjectId: 's1', resultCount: 0 });
  expect(record).toHaveBeenCalledWith('library_searched', { hasQuery: false, hasSubject: true, resultCount: 0 });
});

it('TU — lista sem busca nem filtro não registra evento', () => {
  const { events, record } = setup();
  events.searched({ term: '  ', subjectId: null, resultCount: 10 });
  expect(record).not.toHaveBeenCalled();
});

it('TU — abrir a prévia registra deck_preview_opened só com o id do deck', () => {
  const { events, record } = setup();
  events.previewOpened('d1');
  expect(record).toHaveBeenCalledWith('deck_preview_opened', { deckId: 'd1' });
});

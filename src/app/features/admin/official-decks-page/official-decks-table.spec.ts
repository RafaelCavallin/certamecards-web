import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import type { OfficialDeckAdminSummary } from '../../../core/api/official-deck.model';
import { OfficialDecksTable } from './official-decks-table';

const DECK: OfficialDeckAdminSummary = {
  id: 'd1', subjectId: 's1', subjectName: 'Português', name: 'Crase', description: '', status: 'published',
  cardCount: 12, subscriberCount: 3, openReportCount: 1, contentUpdatedAt: null, version: 1,
};

function render(decks: readonly OfficialDeckAdminSummary[]): { host: HTMLElement; opened: string[] } {
  const fixture = TestBed.createComponent(OfficialDecksTable);
  const opened: string[] = [];
  fixture.componentRef.setInput('decks', decks);
  fixture.componentInstance.open.subscribe((id) => opened.push(id));
  fixture.detectChanges();
  return { host: fixture.nativeElement as HTMLElement, opened };
}

it('TU — lista situação, matéria, contagens e data vazia como traço', () => {
  const { host } = render([DECK]);
  expect(host.textContent).toContain('Publicado');
  expect(host.textContent).toContain('Português');
  expect(host.textContent).toContain('12');
  expect(host.textContent).toContain('—');
});

it('TU — a região rolável tem nome e entra na ordem de tabulação', () => {
  const { host } = render([DECK]);
  const region = host.querySelector('[role="region"]');
  expect(region?.getAttribute('aria-label')).toBe('Lista de decks oficiais');
  expect(region?.getAttribute('tabindex')).toBe('0');
});

it('TU — clicar no nome emite o id do deck', () => {
  const { host, opened } = render([DECK]);
  host.querySelector('button')?.click();
  expect(opened).toEqual(['d1']);
});

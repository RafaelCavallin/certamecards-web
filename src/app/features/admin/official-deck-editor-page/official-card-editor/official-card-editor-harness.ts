import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { Card } from '../../../../core/api/card.model';
import type { OfficialStatus } from '../../../../core/api/deck.model';
import { OfficialDecksApi } from '../../../../core/api/official-decks-api';
import { queryAll, setInputValue } from '../../../../testing/dom-testing';
import { OfficialCardEditor } from './official-card-editor';

export interface Setup {
  readonly fixture: ReturnType<typeof TestBed.createComponent<OfficialCardEditor>>;
  readonly api: Record<'createCard' | 'updateCard', ReturnType<typeof vi.fn>>;
  readonly saved: ReturnType<typeof vi.fn>;
}
export function setupEditor(card: Card | null, status: OfficialStatus, online = true): Setup {
  const api = { createCard: vi.fn().mockResolvedValue({}), updateCard: vi.fn().mockResolvedValue({}) };
  TestBed.configureTestingModule({ providers: [{ provide: OfficialDecksApi, useValue: api }] });
  const fixture = TestBed.createComponent(OfficialCardEditor);
  const saved = vi.fn();
  fixture.componentInstance.saved.subscribe(saved);
  fixture.componentRef.setInput('deckId', 'd1');
  fixture.componentRef.setInput('card', card);
  fixture.componentRef.setInput('status', status);
  fixture.componentRef.setInput('subscribers', 120);
  fixture.componentRef.setInput('online', online);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return { fixture, api, saved };
}
export function fill(fixture: Setup['fixture']): void {
  setInputValue(fixture, '#card-front', 'Nova frente');
  setInputValue(fixture, '#card-back', 'Novo verso');
  fixture.detectChanges();
}
export function choose(fixture: Setup['fixture'], index: number): void {
  (queryAll(fixture, 'input[name="change-kind"]')[index] as HTMLInputElement).dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

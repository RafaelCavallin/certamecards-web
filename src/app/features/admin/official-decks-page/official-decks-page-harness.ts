import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminApi } from '../../../core/api/admin-api';
import { OfficialDecksApi } from '../../../core/api/official-decks-api';
import { queryAll, rootText, waitFor } from '../../../testing/dom-testing';
import { aDeckSummary, aPageOf, routingMocks } from '../official-test-support';
import { OfficialDecksPage } from './official-decks-page';

const SUBJECTS = [{ id: 's1', name: 'Direito Constitucional', active: true, changeSeq: 1, deckCount: 2 }];
export async function setupDecksPage(list = vi.fn().mockResolvedValue(aPageOf([aDeckSummary()]))): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<OfficialDecksPage>>;
  list: ReturnType<typeof vi.fn>;
}> {
  const mocks = routingMocks();
  TestBed.configureTestingModule({
    providers: [
      ...(mocks.providers as Provider[]),
      { provide: OfficialDecksApi, useValue: { list } },
      { provide: AdminApi, useValue: { listSubjects: vi.fn().mockResolvedValue(SUBJECTS) } },
    ],
  });
  const fixture = TestBed.createComponent(OfficialDecksPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Carregando') === false;
  });
  return { fixture, list };
}
export function selectOption(fixture: ReturnType<typeof TestBed.createComponent<OfficialDecksPage>>, id: string, value: string): void {
  const element = queryAll(fixture, `#${id}`)[0] as HTMLSelectElement;
  element.value = value;
  element.dispatchEvent(new Event('change'));
}

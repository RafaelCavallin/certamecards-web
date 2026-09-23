import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { it, vi } from 'vitest';
import { AdminApi } from '../../../core/api/admin-api';
import { OfficialDecksApi } from '../../../core/api/official-decks-api';
import { rootText, waitFor } from '../../../testing/dom-testing';
import { routingMocks } from '../official-test-support';
import { OfficialDeckEditorPage } from './official-deck-editor-page';

it('CA-11 — falha ao carregar mostra alerta', async () => {
  const mocks = routingMocks({ id: 'd1' });
  TestBed.configureTestingModule({
    providers: [
      ...(mocks.providers as Provider[]),
      { provide: OfficialDecksApi, useValue: { get: vi.fn().mockRejectedValue(new Error('x')) } },
      { provide: AdminApi, useValue: { listSubjects: vi.fn().mockResolvedValue([]) } },
    ],
  });
  const fixture = TestBed.createComponent(OfficialDeckEditorPage);
  fixture.detectChanges();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Não foi possível carregar o deck oficial') === true;
  });
});

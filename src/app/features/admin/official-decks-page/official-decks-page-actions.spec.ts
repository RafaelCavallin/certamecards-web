import { expect, it, vi } from 'vitest';
import { queryAll, waitFor } from '../../../testing/dom-testing';
import { aDeckSummary, aPageOf, spyNavigate } from '../official-test-support';
import { setupDecksPage as setup } from './official-decks-page-harness';

it('CA-17 — "Novo deck" e o nome do deck navegam para o editor', async () => {
  const { fixture } = await setup();
  const navigate = spyNavigate();
  queryAll(fixture, 'button').find((button) => button.textContent === 'Novo deck')?.click();
  expect(navigate).toHaveBeenCalledWith(['/admin/decks-oficiais', 'novo']);
  queryAll(fixture, 'td button')[0]?.click();
  expect(navigate).toHaveBeenCalledWith(['/admin/decks-oficiais', 'd1']);
});

it('CA-17 — paginação pede a página seguinte', async () => {
  const list = vi.fn().mockResolvedValue(aPageOf([aDeckSummary()], { total: 45 }));
  const { fixture } = await setup(list);
  queryAll(fixture, 'button').find((button) => button.textContent === 'Próxima')?.click();
  await waitFor(() => list.mock.calls.length >= 2);
  expect(list).toHaveBeenLastCalledWith({ status: null, subjectId: null, page: 1 });
});

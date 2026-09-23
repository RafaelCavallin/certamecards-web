import { HttpErrorResponse } from '@angular/common/http';
import { expect, it } from 'vitest';
import { rootText, setInputValue, submitForm, waitFor } from '../../../../testing/dom-testing';
import { anOfficialCard } from '../../official-test-support';
import { choose, setupEditor as setup } from './official-card-editor-harness';

it('CA-21 — em deck publicado mostra os inscritos afetados e não salva sem a escolha', async () => {
  const { fixture, api } = setup(anOfficialCard(), 'published');
  expect(rootText(fixture)).toContain('Esta edição atinge 120 inscritos');
  submitForm(fixture);
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Escolha entre correção e alteração de conteúdo.') === true;
  });
  expect(api.updateCard).not.toHaveBeenCalled();
});

it('CA-21 — alteração de conteúdo sem nota é recusada apontando o campo', async () => {
  const { fixture, api } = setup(anOfficialCard(), 'published');
  choose(fixture, 1);
  submitForm(fixture);
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Escreva o que mudou no conteúdo.') === true;
  });
  expect(api.updateCard).not.toHaveBeenCalled();
});

it('CA-12 — alteração de conteúdo com nota envia contentChanged e a nota', async () => {
  const { fixture, api, saved } = setup(anOfficialCard(), 'published');
  choose(fixture, 1);
  setInputValue(fixture, '#change-note', 'Lei 14.xxx/2026 alterou o prazo.');
  fixture.detectChanges();
  submitForm(fixture);
  await waitFor(() => saved.mock.calls.length > 0);
  expect(api.updateCard).toHaveBeenCalledWith('c1', 3, expect.objectContaining({ contentChanged: true, note: 'Lei 14.xxx/2026 alterou o prazo.' }));
});

it('CA-13 — correção envia contentChanged=false', async () => {
  const { fixture, api, saved } = setup(anOfficialCard(), 'published');
  choose(fixture, 0);
  submitForm(fixture);
  await waitFor(() => saved.mock.calls.length > 0);
  expect(api.updateCard).toHaveBeenCalledWith('c1', 3, expect.objectContaining({ contentChanged: false }));
});

it('CA-21 — recusa do servidor no campo nota aparece no painel de impacto', async () => {
  const refused = new HttpErrorResponse({
    status: 400,
    error: { status: 400, code: 'validation_failed', detail: 'x', fields: [{ field: 'note', code: 'required', message: 'Escreva o que mudou no conteúdo.' }] },
  });
  const { fixture, api } = setup(anOfficialCard(), 'published');
  api.updateCard.mockRejectedValue(refused);
  choose(fixture, 1);
  setInputValue(fixture, '#change-note', 'nota');
  fixture.detectChanges();
  submitForm(fixture);
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Escreva o que mudou no conteúdo.') === true;
  });
});

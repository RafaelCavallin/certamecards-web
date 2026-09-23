import { HttpErrorResponse } from '@angular/common/http';
import { expect, it } from 'vitest';
import { queryElement, rootText, submitForm, waitFor } from '../../../../testing/dom-testing';
import { anOfficialCard } from '../../official-test-support';
import { fill, setupEditor as setup } from './official-card-editor-harness';

it('CA-11 — "Salvar e adicionar outro" cria o cartão e limpa o formulário para o próximo', async () => {
  const { fixture, api, saved } = setup(null, 'draft');
  fill(fixture);
  submitForm(fixture);
  await waitFor(() => saved.mock.calls.length > 0);
  expect(api.createCard).toHaveBeenCalledWith('d1', expect.objectContaining({ front: 'Nova frente', back: 'Novo verso', source: null }));
  fixture.detectChanges();
  expect((queryElement(fixture, '#card-front') as HTMLTextAreaElement).value).toBe('');
  expect(rootText(fixture)).toContain('Salvar e adicionar outro');
});

it('CA-11 — falha ao criar mantém o texto digitado e mostra o motivo', async () => {
  const { fixture, api, saved } = setup(null, 'draft');
  api.createCard.mockRejectedValue(new HttpErrorResponse({ status: 0 }));
  fill(fixture);
  submitForm(fixture);
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Não foi possível concluir') === true;
  });
  expect((queryElement(fixture, '#card-front') as HTMLTextAreaElement).value).toBe('Nova frente');
  expect(saved).not.toHaveBeenCalled();
});

it('CA-11 — editar em rascunho salva sem a escolha e não mostra o painel de impacto', async () => {
  const { fixture, api, saved } = setup(anOfficialCard(), 'draft');
  expect(queryElement(fixture, 'app-card-change-impact')).toBeNull();
  submitForm(fixture);
  await waitFor(() => saved.mock.calls.length > 0);
  expect(api.updateCard).toHaveBeenCalledWith('c1', 3, { front: 'Fundamentos da República', back: 'Soberania…', source: 'CF/88, art. 1º' });
});

it('CA-04 — sem rede o envio fica desabilitado com o motivo', () => {
  const { fixture } = setup(null, 'draft', false);
  expect((queryElement(fixture, 'button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  expect(rootText(fixture)).toContain('Isso precisa de conexão.');
});

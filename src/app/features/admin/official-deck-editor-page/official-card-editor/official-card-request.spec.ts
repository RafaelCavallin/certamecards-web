import { expect, it } from 'vitest';
import { buildUpdateRequest, impactError, needsImpactChoice } from './official-card-request';

const CONTENT = { front: 'F', back: 'B', source: '' };

it('CA-21 — rascunho não exige a escolha; publicado e descontinuado exigem', () => {
  expect(needsImpactChoice('draft')).toBe(false);
  expect(needsImpactChoice('published')).toBe(true);
  expect(needsImpactChoice('discontinued')).toBe(true);
  expect(impactError('draft', { kind: null, note: '' })).toBeNull();
});

it('CA-21 — sem escolha, a recusa pede correção ou alteração de conteúdo', () => {
  expect(impactError('published', { kind: null, note: '' })).toBe('Escolha entre correção e alteração de conteúdo.');
});

it('CA-21 — alteração de conteúdo exige nota preenchida e de até 200 caracteres', () => {
  expect(impactError('published', { kind: 'content', note: '  ' })).toBe('Escreva o que mudou no conteúdo.');
  expect(impactError('published', { kind: 'content', note: 'a'.repeat(201) })).toBe('Use até 200 caracteres.');
  expect(impactError('published', { kind: 'content', note: 'Lei nova' })).toBeNull();
  expect(impactError('published', { kind: 'correction', note: '' })).toBeNull();
});

it('CA-11 — a requisição de correção envia contentChanged=false; a de conteúdo envia a nota', () => {
  expect(buildUpdateRequest(CONTENT, 'published', { kind: 'correction', note: 'ignorada' })).toEqual({
    front: 'F', back: 'B', source: null, contentChanged: false,
  });
  expect(buildUpdateRequest(CONTENT, 'published', { kind: 'content', note: ' Lei nova ' })).toEqual({
    front: 'F', back: 'B', source: null, contentChanged: true, note: 'Lei nova',
  });
});

it('CA-11 — em rascunho a requisição não leva contentChanged e mantém a fonte', () => {
  expect(buildUpdateRequest({ ...CONTENT, source: 'CF/88' }, 'draft', { kind: null, note: '' })).toEqual({
    front: 'F', back: 'B', source: 'CF/88',
  });
});

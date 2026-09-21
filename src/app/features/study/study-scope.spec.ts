import { convertToParamMap } from '@angular/router';
import { expect, it } from 'vitest';
import { resolveScope } from './study-scope';

it('TU — resolveScope devolve deck quando há query param deck', () => {
  expect(resolveScope(convertToParamMap({ deck: 'd1' }))).toEqual({ kind: 'deck', deckId: 'd1' });
});

it('TU — resolveScope devolve subject quando há query param subject', () => {
  expect(resolveScope(convertToParamMap({ subject: 's1' }))).toEqual({ kind: 'subject', subjectId: 's1' });
});

it('TU — resolveScope devolve all sem parâmetros', () => {
  expect(resolveScope(convertToParamMap({}))).toEqual({ kind: 'all' });
});

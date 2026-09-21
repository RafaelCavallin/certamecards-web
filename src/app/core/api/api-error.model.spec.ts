import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { extractApiError, isApiError } from './api-error.model';

describe('isApiError', () => {
  it('TU — aceita um objeto com code e detail', () => {
    expect(isApiError({ code: 'invalid_credentials', detail: 'E-mail ou senha incorretos.' })).toBe(true);
  });

  it('TU — rejeita valores sem code ou sem detail', () => {
    expect(isApiError({ detail: 'x' })).toBe(false);
    expect(isApiError({ code: 'x' })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError('erro')).toBe(false);
  });
});

describe('extractApiError', () => {
  it('TU — extrai o ApiError de um HttpErrorResponse', () => {
    const error = new HttpErrorResponse({ error: { code: 'invalid_credentials', detail: 'x' } });
    expect(extractApiError(error)?.code).toBe('invalid_credentials');
  });

  it('TU — devolve null quando o erro não é HttpErrorResponse', () => {
    expect(extractApiError(new Error('boom'))).toBeNull();
  });

  it('TU — devolve null quando o corpo do erro não é um ApiError', () => {
    const error = new HttpErrorResponse({ error: 'texto qualquer' });
    expect(extractApiError(error)).toBeNull();
  });
});

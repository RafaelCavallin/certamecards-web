import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { expect, it } from 'vitest';
import { LocalStorageFullError } from './local-storage-error';
import { classifySyncError } from './sync-error-classifier';

it('TU-71 — classifica rede, timeout, 429 e 5xx como transitório', () => {
  expect(classifySyncError(new HttpErrorResponse({ status: 0 })).category).toBe('transient');
  expect(classifySyncError(new HttpErrorResponse({ status: 408 })).category).toBe('transient');
  expect(classifySyncError(new HttpErrorResponse({ status: 429 })).category).toBe('transient');
  expect(classifySyncError(new HttpErrorResponse({ status: 503 })).category).toBe('transient');
});

it('TU-71 — extrai o Retry-After em segundos para erros transitórios', () => {
  const error = new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '30' }) });
  expect(classifySyncError(error)).toEqual({ category: 'transient', retryAfterSeconds: 30 });
});

it('TU-71 — classifica 401 como autenticação', () => {
  expect(classifySyncError(new HttpErrorResponse({ status: 401 })).category).toBe('auth');
});

it('TU-71 — classifica erro estrutural do lote como ação do usuário', () => {
  expect(classifySyncError(new HttpErrorResponse({ status: 400 })).category).toBe('action');
});

it('TU-71 — classifica QuotaExceededError como falta de espaço local', () => {
  expect(classifySyncError(new LocalStorageFullError()).category).toBe('quota');
});

it('TU-71 — erro desconhecido é tratado como transitório', () => {
  expect(classifySyncError(new Error('rede indisponível')).category).toBe('transient');
});

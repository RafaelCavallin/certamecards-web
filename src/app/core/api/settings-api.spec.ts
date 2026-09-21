import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { SettingsApi } from './settings-api';

function setup(): { settingsApi: SettingsApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { settingsApi: TestBed.inject(SettingsApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — get devolve os ajustes atuais', async () => {
  const { settingsApi, httpMock } = setup();
  const promise = settingsApi.get();
  const req = httpMock.expectOne('/api/me/settings');
  expect(req.request.method).toBe('GET');
  req.flush({ newPerDay: 20, reviewsPerDay: 9999, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo', theme: 'noite', changeSeq: 1 });
  await expect(promise).resolves.toMatchObject({ newPerDay: 20 });
});

it('TU — update envia os ajustes e devolve o novo changeSeq', async () => {
  const { settingsApi, httpMock } = setup();
  const promise = settingsApi.update({
    newPerDay: 30,
    reviewsPerDay: 100,
    focusMinutes: 30,
    examDate: null,
    timeZone: 'America/Sao_Paulo',
    theme: 'dia',
  });
  const req = httpMock.expectOne('/api/me/settings');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toMatchObject({ newPerDay: 30, theme: 'dia' });
  req.flush({ newPerDay: 30, reviewsPerDay: 100, focusMinutes: 30, examDate: null, timeZone: 'America/Sao_Paulo', theme: 'dia', changeSeq: 2 });
  await expect(promise).resolves.toMatchObject({ changeSeq: 2 });
});

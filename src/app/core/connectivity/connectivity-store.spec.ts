import { TestBed } from '@angular/core/testing';
import { beforeEach, expect, it } from 'vitest';
import { ConnectivityStore } from './connectivity-store';

let store: ConnectivityStore;

beforeEach(() => {
  TestBed.configureTestingModule({});
  store = TestBed.inject(ConnectivityStore);
});

it('TU-22 — reportHttpStatus com erro de rede (status 0) marca offline', () => {
  store.reportHttpStatus(0);
  expect(store.online()).toBe(false);
});

it('TU-22 — reportHttpStatus com 502 marca offline', () => {
  store.reportHttpStatus(502);
  expect(store.online()).toBe(false);
});

it('TU-22 — reportHttpStatus com 503 marca offline', () => {
  store.reportHttpStatus(503);
  expect(store.online()).toBe(false);
});

it('TU-22 — reportHttpStatus com 504 marca offline', () => {
  store.reportHttpStatus(504);
  expect(store.online()).toBe(false);
});

it('TU-22 — reportHttpStatus com 4xx mantém online', () => {
  store.reportHttpStatus(404);
  expect(store.online()).toBe(true);
});

it('TU-22 — reportHttpStatus com 200 depois de um erro volta a marcar online', () => {
  store.reportHttpStatus(502);
  store.reportHttpStatus(200);
  expect(store.online()).toBe(true);
});

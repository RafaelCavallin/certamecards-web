import { expect, it } from 'vitest';
import { isSyncLeaseState } from './sync-lease.model';

it('TU — isSyncLeaseState reconhece um lease válido', () => {
  expect(isSyncLeaseState({ ownerId: 'tab-1', expiresAt: '2026-09-17T12:00:00.000Z' })).toBe(true);
});

it('TU — isSyncLeaseState rejeita valores sem os campos esperados', () => {
  expect(isSyncLeaseState({ ownerId: 'tab-1' })).toBe(false);
  expect(isSyncLeaseState(null)).toBe(false);
  expect(isSyncLeaseState(42)).toBe(false);
});

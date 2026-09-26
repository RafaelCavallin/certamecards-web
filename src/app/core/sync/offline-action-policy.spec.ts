import { expect, it } from 'vitest';
import { isAllowedOffline, type OfflineAction } from './offline-action-policy';

it('TU-82 — regras offline permitem somente as ações do PRD', () => {
  const allowed: readonly OfflineAction[] = ['deck', 'card', 'suspension', 'reset', 'settings', 'profile'];
  const blocked: readonly OfflineAction[] = ['library', 'preview', 'subscription', 'duplicate', 'error_report', 'admin', 'account_delete'];
  expect(allowed.every(isAllowedOffline)).toBe(true);
  expect(blocked.some(isAllowedOffline)).toBe(false);
});

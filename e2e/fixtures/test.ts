import { test as base } from '@playwright/test';
import { createAdmin } from './admin';
import type { Candidate } from './api-client';
import { createConfirmedCandidate } from './api-client';
import { uniqueName } from './official-names';

const FIXTURE_TIMEOUT_MS = 120_000;
export const test = base.extend<{ candidate: Candidate; admin: Candidate }>({
  candidate: [
    // eslint-disable-next-line no-empty-pattern -- Playwright exige a desestruturação para inferir as fixtures usadas
    async ({}, use) => {
      await use(await createConfirmedCandidate());
    },
    { timeout: FIXTURE_TIMEOUT_MS },
  ],
  admin: [
    // eslint-disable-next-line no-empty-pattern -- Playwright exige a desestruturação para inferir as fixtures usadas
    async ({}, use) => {
      await use(await createAdmin(uniqueName('Administrador')));
    },
    { timeout: FIXTURE_TIMEOUT_MS },
  ],
});
export { expect } from '@playwright/test';

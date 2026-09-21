import { test as base } from '@playwright/test';
import type { Candidate } from './api-client';
import { createConfirmedCandidate } from './api-client';

export const test = base.extend<{ candidate: Candidate }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright exige a desestruturação para inferir as fixtures usadas
  candidate: async ({}, use) => {
    const candidate = await createConfirmedCandidate();
    await use(candidate);
  },
});
export { expect } from '@playwright/test';

import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Candidate } from './api-client';
import { publishOfficialDeck } from './official-api';
import { uniqueName } from './official-names';

const SUBJECTS = ['Direito Constitucional', 'Português', 'Informática'] as const;
const SUGGESTION_COUNT = 3;
const SUGGESTION_ROW = 'section[aria-labelledby="suggestions-title"] div.flex.flex-wrap.items-center.gap-4';
export async function seedOneDeckPerSubject(admin: Candidate, mainName: string, mainCards: number): Promise<void> {
  const names = [mainName, uniqueName('Sugestão B'), uniqueName('Sugestão C')];
  await Promise.all(
    SUBJECTS.map((subjectName, index) =>
      publishOfficialDeck(admin, { name: names[index] ?? mainName, subjectName, cardCount: index === 0 ? mainCards : 5 }),
    ),
  );
}
export async function expectSuggestionsWithDifferentSubjects(page: Page): Promise<void> {
  const rows = page.locator(SUGGESTION_ROW);
  await expect(rows).toHaveCount(SUGGESTION_COUNT);
  const subjects = await rows.locator('p.uppercase').allTextContents();
  expect(new Set(subjects).size).toBe(SUGGESTION_COUNT);
}

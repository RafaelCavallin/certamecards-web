import type { ActivatedRoute } from '@angular/router';
import { DEFAULT_FOCUS_MINUTES } from '../../core/study/study-constants';
import type { StudySessionStore } from '../../core/study/study-session-store';
import type { SettingsData } from '../../core/data/settings-data';
import { resolveScope } from './study-scope';
import { summaryTexts } from './study-texts';
import type { StudyPhase, SummaryView } from './study-page.model';

export interface StartOutcome {
  readonly phase: StudyPhase;
  readonly nextAvailableAt: Date | null;
}
export async function runStart(store: StudySessionStore, settingsData: SettingsData, route: ActivatedRoute): Promise<StartOutcome> {
  const scope = resolveScope(route.snapshot.queryParamMap);
  const focusMinutes = settingsData.current()?.focusMinutes ?? DEFAULT_FOCUS_MINUTES;
  const result = await store.start(scope, focusMinutes);
  if (!result.started) {
    return { phase: 'unavailable', nextAvailableAt: result.nextAvailableAt };
  }
  return { phase: 'session', nextAvailableAt: null };
}
export function buildSummaryView(store: StudySessionStore): SummaryView {
  const result = store.end();
  const texts = summaryTexts({
    reviewed: result.reviewed,
    blockDone: result.blockDone,
    cardsLeftNow: result.cardsLeftNow,
    uniqueCards: result.uniqueCards,
  });
  return { ...result, ...texts };
}

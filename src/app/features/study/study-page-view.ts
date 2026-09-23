import type { CardState } from '../../core/api/card-state.model';
import { contentUpdateNotice } from '../../core/library/content-update-notice';
import type { PreviewByRating } from '../../core/scheduler/scheduler.model';
import type { FocusTimerMode } from '../../shared/ui/focus-timer/focus-timer';

const EMPTY_INTERVALS: Readonly<Record<1 | 2 | 3 | 4, string>> = { 1: '', 2: '', 3: '', 4: '' };
export function intervalLabels(previews: PreviewByRating | null): Readonly<Record<1 | 2 | 3 | 4, string>> {
  if (previews === null) {
    return EMPTY_INTERVALS;
  }
  return { 1: previews[1].intervalLabel, 2: previews[2].intervalLabel, 3: previews[3].intervalLabel, 4: previews[4].intervalLabel };
}
export function focusTimerMode(remainingSeconds: number, paused: boolean): FocusTimerMode {
  if (remainingSeconds <= 0) {
    return 'done';
  }
  return paused ? 'pause' : 'focus';
}
export function noticeOf(state: CardState | null): string | null {
  return state === null ? null : contentUpdateNotice(state);
}

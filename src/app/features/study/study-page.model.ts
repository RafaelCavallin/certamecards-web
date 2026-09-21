import type { SessionSummary } from '../../core/study/session-summary';

export type StudyPhase = 'loading' | 'unavailable' | 'session' | 'summary';
export interface SummaryView extends SessionSummary {
  readonly title: string;
  readonly message: string;
}

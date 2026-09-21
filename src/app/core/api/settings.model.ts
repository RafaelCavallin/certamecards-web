export type Theme = 'noite' | 'dia' | 'auto';
export interface UserSettings {
  readonly newPerDay: number;
  readonly reviewsPerDay: number;
  readonly focusMinutes: number;
  readonly examDate: string | null;
  readonly timeZone: string;
  readonly theme: Theme;
  readonly changeSeq: number;
}

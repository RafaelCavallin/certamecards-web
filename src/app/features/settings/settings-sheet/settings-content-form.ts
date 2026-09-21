import type { WritableSignal } from '@angular/core';
import { form, max, maxLength, min, required, type FieldTree } from '@angular/forms/signals';
import type { Theme } from '../../../core/api/settings.model';
import { DEFAULT_FOCUS_MINUTES, DEFAULT_TIME_ZONE } from '../../../core/study/study-constants';

const NEW_PER_DAY_MIN = 0;
const NEW_PER_DAY_MAX = 500;
const REVIEWS_PER_DAY_MIN = 0;
const REVIEWS_PER_DAY_MAX = 9999;
const FOCUS_MINUTES_MIN = 15;
const FOCUS_MINUTES_MAX = 60;
const DISPLAY_NAME_MAX_LENGTH = 60;
export const DEFAULT_NEW_PER_DAY = 20;
export const DEFAULT_REVIEWS_PER_DAY = 9999;
export interface SettingsFormModel {
  readonly displayName: string;
  readonly newPerDay: number;
  readonly reviewsPerDay: number;
  readonly focusMinutes: number;
  readonly examDate: string;
  readonly timeZone: string;
  readonly theme: Theme;
}
export function emptySettingsFormModel(): SettingsFormModel {
  return {
    displayName: '',
    newPerDay: DEFAULT_NEW_PER_DAY,
    reviewsPerDay: DEFAULT_REVIEWS_PER_DAY,
    focusMinutes: DEFAULT_FOCUS_MINUTES,
    examDate: '',
    timeZone: DEFAULT_TIME_ZONE,
    theme: 'noite',
  };
}
export function buildSettingsForm(model: WritableSignal<SettingsFormModel>): FieldTree<SettingsFormModel> {
  return form(model, (schemaPath) => {
    required(schemaPath.displayName, { message: 'Informe seu nome de exibição.' });
    maxLength(schemaPath.displayName, DISPLAY_NAME_MAX_LENGTH, { message: 'Use até 60 caracteres.' });
    min(schemaPath.newPerDay, NEW_PER_DAY_MIN, { message: 'Use um valor entre 0 e 500.' });
    max(schemaPath.newPerDay, NEW_PER_DAY_MAX, { message: 'Use um valor entre 0 e 500.' });
    min(schemaPath.reviewsPerDay, REVIEWS_PER_DAY_MIN, { message: 'Use um valor entre 0 e 9.999.' });
    max(schemaPath.reviewsPerDay, REVIEWS_PER_DAY_MAX, { message: 'Use um valor entre 0 e 9.999.' });
    min(schemaPath.focusMinutes, FOCUS_MINUTES_MIN, { message: 'Use um valor entre 15 e 60.' });
    max(schemaPath.focusMinutes, FOCUS_MINUTES_MAX, { message: 'Use um valor entre 15 e 60.' });
  });
}

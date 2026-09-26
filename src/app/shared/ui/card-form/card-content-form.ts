import type { WritableSignal } from '@angular/core';
import { disabled, form, maxLength, required, type FieldTree } from '@angular/forms/signals';

const FRONT_MAX_LENGTH = 1000;
const BACK_MAX_LENGTH = 2000;
const SOURCE_MAX_LENGTH = 120;
export interface CardFormModel {
  readonly front: string;
  readonly back: string;
  readonly source: string;
}
export function emptyCardFormModel(): CardFormModel {
  return { front: '', back: '', source: '' };
}
export function buildCardForm(
  model: WritableSignal<CardFormModel>,
  isSaving: () => boolean = () => false,
): FieldTree<CardFormModel> {
  return form(model, (schemaPath) => {
    disabled(schemaPath, { when: isSaving });
    required(schemaPath.front, { message: 'Informe a pergunta.' });
    maxLength(schemaPath.front, FRONT_MAX_LENGTH, { message: 'Use até 1.000 caracteres.' });
    required(schemaPath.back, { message: 'Informe a resposta.' });
    maxLength(schemaPath.back, BACK_MAX_LENGTH, { message: 'Use até 2.000 caracteres.' });
    maxLength(schemaPath.source, SOURCE_MAX_LENGTH, { message: 'Use até 120 caracteres.' });
  });
}

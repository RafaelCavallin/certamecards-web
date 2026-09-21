import type { WritableSignal } from '@angular/core';
import { form, maxLength, required, type FieldTree } from '@angular/forms/signals';

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
export interface DeckFormModel {
  readonly subjectId: string;
  readonly name: string;
  readonly description: string;
}
export function emptyDeckFormModel(): DeckFormModel {
  return { subjectId: '', name: '', description: '' };
}
export function buildDeckForm(model: WritableSignal<DeckFormModel>): FieldTree<DeckFormModel> {
  return form(model, (schemaPath) => {
    required(schemaPath.subjectId, { message: 'Escolha uma matéria.' });
    required(schemaPath.name, { message: 'Informe o nome do deck.' });
    maxLength(schemaPath.name, NAME_MAX_LENGTH, { message: 'Use até 120 caracteres.' });
    maxLength(schemaPath.description, DESCRIPTION_MAX_LENGTH, { message: 'Use até 500 caracteres.' });
  });
}

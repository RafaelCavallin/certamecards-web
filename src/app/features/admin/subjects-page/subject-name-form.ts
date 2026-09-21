import type { WritableSignal } from '@angular/core';
import { form, maxLength, required, type FieldTree } from '@angular/forms/signals';

const SUBJECT_NAME_MAX_LENGTH = 60;
export interface SubjectNameModel {
  readonly name: string;
}
export function buildSubjectNameForm(model: WritableSignal<SubjectNameModel>): FieldTree<SubjectNameModel> {
  return form(model, (schemaPath) => {
    required(schemaPath.name, { message: 'Informe o nome da matéria.' });
    maxLength(schemaPath.name, SUBJECT_NAME_MAX_LENGTH, { message: 'Use até 60 caracteres.' });
  });
}

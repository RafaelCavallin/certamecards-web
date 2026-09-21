import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminApi } from '../../../core/api/admin-api';
import type { AdminSubject } from '../../../core/api/admin.model';
import { SubjectsPage } from './subjects-page';

export function aSubject(overrides: Partial<AdminSubject> = {}): AdminSubject {
  return { id: '1', name: 'Direito Penal', active: true, changeSeq: 1, deckCount: 2, ...overrides };
}
export interface SubjectsPageHarness {
  readonly listSubjects: ReturnType<typeof vi.fn>;
  readonly createSubject: ReturnType<typeof vi.fn>;
  readonly updateSubject: ReturnType<typeof vi.fn>;
}
export function setupSubjectsPage(subjects: readonly AdminSubject[]): SubjectsPageHarness {
  const listSubjects = vi.fn().mockResolvedValue(subjects);
  const createSubject = vi.fn();
  const updateSubject = vi.fn();
  TestBed.configureTestingModule({
    imports: [SubjectsPage],
    providers: [provideRouter([]), { provide: AdminApi, useValue: { listSubjects, createSubject, updateSubject } }],
  });
  return { listSubjects, createSubject, updateSubject };
}

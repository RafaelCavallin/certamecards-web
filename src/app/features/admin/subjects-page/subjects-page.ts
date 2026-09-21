import { Component, inject, signal } from '@angular/core';
import { FormField, submit } from '@angular/forms/signals';
import { AdminApi } from '../../../core/api/admin-api';
import { extractApiError } from '../../../core/api/api-error.model';
import type { AdminSubject } from '../../../core/api/admin.model';
import { AdminNav } from '../admin-nav/admin-nav';
import { adminErrorMessage } from '../admin-errors';
import { buildSubjectNameForm } from './subject-name-form';

@Component({
  selector: 'app-subjects-page',
  imports: [FormField, AdminNav],
  templateUrl: './subjects-page.html',
})
export class SubjectsPage {
  private readonly adminApi = inject(AdminApi);

  protected readonly subjects = signal<readonly AdminSubject[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingToggleId = signal<string | null>(null);
  protected readonly createModel = signal({ name: '' });
  protected readonly createForm = buildSubjectNameForm(this.createModel);
  protected readonly renameModel = signal({ name: '' });
  protected readonly renameForm = buildSubjectNameForm(this.renameModel);

  constructor() {
    void this.loadSubjects();
  }

  protected onCreateSubmit(): void {
    void submit(this.createForm, async () => {
      await this.createSubject();
    });
  }

  protected onRenameStart(subject: AdminSubject | null): void {
    this.editingId.set(subject?.id ?? null);
    this.renameModel.set({ name: subject?.name ?? '' });
  }

  protected onRenameSubmit(id: string): void {
    void submit(this.renameForm, async () => {
      await this.renameSubject(id);
    });
  }

  protected onToggleActive(id: string | null): void {
    this.pendingToggleId.set(id);
  }

  protected onToggleActiveConfirm(subject: AdminSubject): void {
    void this.toggleActive(subject);
  }

  private async loadSubjects(): Promise<void> {
    this.loading.set(true);
    try {
      this.subjects.set(await this.adminApi.listSubjects());
    } finally {
      this.loading.set(false);
    }
  }

  private async createSubject(): Promise<void> {
    this.errorMessage.set(null);
    try {
      const created = await this.adminApi.createSubject({ name: this.createModel().name });
      this.subjects.update((items) => [...items, created]);
      this.createModel.set({ name: '' });
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }

  private async renameSubject(id: string): Promise<void> {
    this.errorMessage.set(null);
    try {
      const updated = await this.adminApi.updateSubject(id, { name: this.renameModel().name });
      this.subjects.update((items) => items.map((item) => (item.id === id ? updated : item)));
      this.editingId.set(null);
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }

  private async toggleActive(subject: AdminSubject): Promise<void> {
    this.errorMessage.set(null);
    this.pendingToggleId.set(null);
    try {
      const updated = await this.adminApi.updateSubject(subject.id, { active: !subject.active });
      this.subjects.update((items) => items.map((item) => (item.id === subject.id ? updated : item)));
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, required, submit } from '@angular/forms/signals';
import { AdminApi } from '../../../core/api/admin-api';
import { extractApiError } from '../../../core/api/api-error.model';
import type { AdminUser } from '../../../core/api/admin.model';
import { AdminNav } from '../admin-nav/admin-nav';
import { adminErrorMessage } from '../admin-errors';

@Component({
  selector: 'app-admins-page',
  imports: [FormField, AdminNav],
  templateUrl: './admins-page.html',
})
export class AdminsPage {
  private readonly adminApi = inject(AdminApi);

  protected readonly admins = signal<readonly AdminUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pendingRevokeId = signal<string | null>(null);
  protected readonly grantModel = signal({ email: '' });
  protected readonly grantForm = form(this.grantModel, (schemaPath) => {
    required(schemaPath.email, { message: 'Informe o e-mail.' });
    email(schemaPath.email, { message: 'Informe um e-mail válido.' });
  });

  constructor() {
    void this.loadAdmins();
  }

  protected onGrantSubmit(): void {
    void submit(this.grantForm, async () => {
      await this.grantAdmin();
    });
  }

  protected onRevokeRequest(id: string): void {
    this.pendingRevokeId.set(id);
  }

  protected onRevokeCancel(): void {
    this.pendingRevokeId.set(null);
  }

  protected onRevokeConfirm(id: string): void {
    void this.revokeAdmin(id);
  }

  private async loadAdmins(): Promise<void> {
    this.loading.set(true);
    try {
      this.admins.set(await this.adminApi.listAdmins());
    } finally {
      this.loading.set(false);
    }
  }

  private async grantAdmin(): Promise<void> {
    this.errorMessage.set(null);
    try {
      const granted = await this.adminApi.grantAdmin({ email: this.grantModel().email });
      this.admins.update((items) => [...items, granted]);
      this.grantModel.set({ email: '' });
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }

  private async revokeAdmin(id: string): Promise<void> {
    this.errorMessage.set(null);
    this.pendingRevokeId.set(null);
    try {
      await this.adminApi.revokeAdmin(id);
      this.admins.update((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { extractApiError } from '../../../core/api/api-error.model';
import { AuthApi } from '../../../core/api/auth-api';
import { AUTH_PATHS } from '../../../core/auth/auth-constants';
import { AuthStore } from '../../../core/auth/auth-store';
import { parseFragmentToken } from '../../../core/auth/fragment-token';
import { deleteAccountErrorMessage } from './delete-account-errors';

type DeleteAccountStep = 'form' | 'confirm';
@Component({
  selector: 'app-delete-account-page',
  imports: [FormField],
  templateUrl: './delete-account-page.html',
})
export class DeleteAccountPage {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly reauthToken = parseFragmentToken(inject(ActivatedRoute).snapshot.fragment, 'reauth');

  protected readonly googleReauthUrl = `${AUTH_PATHS.googleAuthorization}?intent=reauth`;
  protected readonly hasReauthToken = this.reauthToken !== '';
  protected readonly step = signal<DeleteAccountStep>(this.hasReauthToken ? 'confirm' : 'form');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly model = signal({ password: '' });
  protected readonly passwordForm = form(this.model, (schemaPath) => {
    required(schemaPath.password, { message: 'Informe sua senha para continuar.' });
  });

  protected onContinue(): void {
    // eslint-disable-next-line @typescript-eslint/require-await -- submit() exige um callback async
    void submit(this.passwordForm, async () => {
      this.step.set('confirm');
    });
  }

  protected onCancel(): void {
    this.step.set('form');
  }

  protected onConfirmDelete(): void {
    void this.deleteAccount();
  }

  private async deleteAccount(): Promise<void> {
    this.errorMessage.set(null);
    this.submitting.set(true);
    try {
      await this.authApi.deleteAccount({
        password: this.hasReauthToken ? null : this.model().password,
        reauthToken: this.hasReauthToken ? this.reauthToken : null,
      });
      await this.authStore.logout();
    } catch (error) {
      this.errorMessage.set(deleteAccountErrorMessage(extractApiError(error)));
      this.submitting.set(false);
    }
  }
}

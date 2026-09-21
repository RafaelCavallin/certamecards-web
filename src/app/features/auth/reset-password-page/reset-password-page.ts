import { Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { extractApiError } from '../../../core/api/api-error.model';
import { AuthApi } from '../../../core/api/auth-api';
import { parseFragmentToken } from '../../../core/auth/fragment-token';

type ResetPasswordStatus = 'form' | 'done' | 'expired';
@Component({
  selector: 'app-reset-password-page',
  imports: [FormField, RouterLink],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private readonly authApi = inject(AuthApi);
  private readonly token = parseFragmentToken(inject(ActivatedRoute).snapshot.fragment, 'token');

  protected readonly status = signal<ResetPasswordStatus>('form');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly model = signal({ newPassword: '', confirmPassword: '' });
  protected readonly resetForm = form(this.model, (schemaPath) => {
    required(schemaPath.newPassword, { message: 'Informe a nova senha.' });
    minLength(schemaPath.newPassword, 8, { message: 'A senha precisa ter pelo menos 8 caracteres.' });
    required(schemaPath.confirmPassword, { message: 'Confirme a nova senha.' });
    validate(schemaPath.confirmPassword, (ctx) =>
      ctx.value() === ctx.valueOf(schemaPath.newPassword)
        ? undefined
        : { kind: 'mismatch', message: 'As senhas não coincidem.' },
    );
  });

  protected onSubmit(): void {
    void submit(this.resetForm, async () => {
      this.errorMessage.set(null);
      this.submitting.set(true);
      try {
        await this.attemptReset();
      } finally {
        this.submitting.set(false);
      }
    });
  }

  private async attemptReset(): Promise<void> {
    try {
      await this.authApi.resetPassword({ token: this.token, newPassword: this.model().newPassword });
      this.status.set('done');
    } catch (error) {
      const apiError = extractApiError(error);
      const wasUsedOrExpired = apiError?.code === 'token_used' || apiError?.code === 'token_expired';
      if (wasUsedOrExpired) {
        this.status.set('expired');
        return;
      }
      this.errorMessage.set('Não foi possível redefinir a senha. Tente de novo.');
    }
  }
}

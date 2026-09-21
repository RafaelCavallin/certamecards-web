import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { AuthApi } from '../../../core/api/auth-api';

@Component({
  selector: 'app-forgot-password-page',
  imports: [FormField, RouterLink],
  templateUrl: './forgot-password-page.html',
})
export class ForgotPasswordPage {
  private readonly authApi = inject(AuthApi);

  protected readonly model = signal({ email: '' });
  protected readonly forgotForm = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'Informe o e-mail.' });
    email(schemaPath.email, { message: 'Informe um e-mail válido.' });
  });

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);

  protected onSubmit(): void {
    void submit(this.forgotForm, async () => {
      this.submitting.set(true);
      try {
        await this.authApi.forgotPassword(this.model().email);
        this.sent.set(true);
      } finally {
        this.submitting.set(false);
      }
    });
  }
}

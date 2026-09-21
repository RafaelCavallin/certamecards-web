import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { extractApiError } from '../../../core/api/api-error.model';
import { AuthApi } from '../../../core/api/auth-api';
import { AUTH_PATHS, TERMS_CURRENT_VERSION } from '../../../core/auth/auth-constants';
import { registerErrorMessage } from './register-errors';

@Component({
  selector: 'app-register-page',
  imports: [FormField, RouterLink],
  templateUrl: './register-page.html',
})
export class RegisterPage {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly googleAuthorizationUrl = `${AUTH_PATHS.googleAuthorization}?intent=login`;
  protected readonly model = signal({ email: '', password: '', displayName: '', acceptedTerms: false });
  protected readonly registerForm = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'Informe o e-mail.' });
    email(schemaPath.email, { message: 'Informe um e-mail válido.' });
    required(schemaPath.displayName, { message: 'Informe seu nome de exibição.' });
    required(schemaPath.password, { message: 'Informe a senha.' });
    minLength(schemaPath.password, 8, { message: 'A senha precisa ter pelo menos 8 caracteres.' });
    validate(schemaPath.acceptedTerms, ({ value }) =>
      value() ? undefined : { kind: 'required', message: 'Aceite os termos para continuar.' },
    );
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onSubmit(): void {
    void submit(this.registerForm, async () => {
      this.errorMessage.set(null);
      this.submitting.set(true);
      try {
        await this.attemptRegister();
      } finally {
        this.submitting.set(false);
      }
    });
  }

  private async attemptRegister(): Promise<void> {
    const { email: registeredEmail } = this.model();
    try {
      await this.authApi.register({
        ...this.model(),
        acceptedTermsVersion: TERMS_CURRENT_VERSION,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await this.router.navigate([AUTH_PATHS.confirmEmail], { queryParams: { email: registeredEmail } });
    } catch (error) {
      this.errorMessage.set(registerErrorMessage(extractApiError(error)));
    }
  }
}
